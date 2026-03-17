<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\PDF\ReservationPdfService;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Reservation::with(['user', 'category']);

        if ($user->role === 'requester') {
            $query->where('user_id', $user->id);
        }

        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('date_from')) {
            $query->whereDate('date_of_use', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('date_of_use', '<=', $request->date_to);
        }

        return $query->latest()->get();
    }

    public function publicIndex(Request $request)
    {
        return Reservation::where('status', 'approved')
            ->select([
                'id', 'activity_event', 'date_of_use', 'inclusive_time_start', 'inclusive_time_end', 'category_id',
                'hrdc_hall', 'av_studio', 'bleacher', 'alba_hall', 'student_center_mini_theater',
                'cte_training_hall_2_or_3', 'admin_building_2nd_floor', 'multi_purpose_hall_3f',
                'hum_av_theater', 'dance_studio_hall_3f', 'cme_gym', 'classroom_specify',
                'laboratory_room_specify', 'library_grounds', 'hrdc_quadrangle_stage', 'others_venue_specify'
            ])
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'activity_event' => 'required|string',
            'requesting_party' => 'required|string',
            'date_of_use' => 'required|date',
            'inclusive_time_start' => 'required',
            'inclusive_time_end' => 'required',
            'category_id' => 'required|exists:categories,id',
            // Add other validations as needed
        ]);

        $reservation = Reservation::create(array_merge(
            $request->all(),
            ['user_id' => Auth::id(), 'status' => 'pending']
        ));

        return response()->json($reservation, 201);
    }

    public function show($id)
    {
        $reservation = Reservation::with(['user', 'category'])->findOrFail($id);
        
        // Authorization check
        $user = Auth::user();
        if ($user->role === 'requester' && $reservation->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $reservation;
    }

    public function update(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);
        
        // Only requester can update their own pending reservation, or admin/staff
        $user = Auth::user();
        if ($user->role === 'requester') {
            if ($reservation->user_id !== $user->id || $reservation->status !== 'pending') {
                return response()->json(['message' => 'Cannot update this reservation'], 403);
            }
        }

        // Lock OR details once approved and OR already exists
        if (
            $reservation->status === 'approved' &&
            ($reservation->or_number || $reservation->or_amount || $reservation->or_date) &&
            ($request->hasAny(['or_number', 'or_amount', 'or_date']))
        ) {
            return response()->json(['message' => 'Official Receipt details are locked for approved reservations'], 422);
        }

        $reservation->update($request->except(['user_id', 'status'])); // Status updated via separate endpoint

        return $reservation;
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,pending',
            'reason' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        if (!in_array($user->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reservation = Reservation::findOrFail($id);
        $reservation->status = $request->status;
        // Store or clear rejection reason based on status
        if ($request->status === 'rejected') {
            $reservation->rejection_reason = $request->input('reason');
        } else {
            $reservation->rejection_reason = null;
        }
        
        if ($request->status === 'approved') {
            $reservation->approved_by = $user->name;
        }

        $reservation->save();

        return $reservation;
    }

    public function destroy($id)
    {
        $reservation = Reservation::findOrFail($id);
        $user = Auth::user();

        if ($user->role === 'requester' && $reservation->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reservation->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function formPdf(Request $request, ReservationPdfService $pdfService)
    {
        $request->validate([
            'activity_event' => 'required|string',
            'requesting_party' => 'required|string',
            'requested_by' => 'nullable|string',
            'date_of_use' => 'required|string',
            'inclusive_time_start' => 'required|string',
            'inclusive_time_end' => 'required|string',
            'or_number' => 'nullable|string',
            'amount' => 'nullable|string',
            'or_date' => 'nullable|string',
            'venue_name' => 'nullable|string',
            'venue_key' => 'nullable|string',
            'selected_audio' => 'array',
            'selected_video' => 'array',
            'selected_lighting' => 'array',
            'audio_details' => 'array',
            'video_details' => 'array',
            'lighting_details' => 'array',
        ]);

        try {
            $content = $pdfService->generate($request->all());
            return response($content, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="ReservationForm.pdf"');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
