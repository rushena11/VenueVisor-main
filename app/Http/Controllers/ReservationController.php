<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\PDF\ReservationPdfService;

class ReservationController extends Controller
{
    private function venueBoolKeys(): array
    {
        return [
            'hrdc_hall',
            'av_studio',
            'bleacher',
            'alba_hall',
            'student_center_mini_theater',
            'cte_training_hall_2_or_3',
            'admin_building_2nd_floor',
            'multi_purpose_hall_3f',
            'hum_av_theater',
            'dance_studio_hall_3f',
            'cme_gym',
            'library_grounds',
            'hrdc_quad_stage',
            'hrdc_quadrangle_stage',
        ];
    }

    private function venueStringKeys(): array
    {
        return [
            'classroom_specify',
            'laboratory_room_specify',
            'others_venue_specify',
        ];
    }

    private function extractRequestedVenues(Request $request, ?Reservation $fallback = null): array
    {
        $boolKeys = $this->venueBoolKeys();
        $stringKeys = $this->venueStringKeys();

        $hasVenueInput = false;
        foreach (array_merge($boolKeys, $stringKeys) as $k) {
            if ($request->has($k)) {
                $hasVenueInput = true;
                break;
            }
        }

        $source = $hasVenueInput ? $request : $fallback;

        $boolSelected = [];
        foreach ($boolKeys as $k) {
            $val = $source instanceof Request ? $source->boolean($k) : (bool) ($source?->{$k} ?? false);
            if ($val) {
                $boolSelected[] = $k;
            }
        }

        $stringSelected = [];
        foreach ($stringKeys as $k) {
            $raw = $source instanceof Request ? $source->input($k) : ($source?->{$k} ?? null);
            $v = is_string($raw) ? trim($raw) : '';
            if ($v !== '') {
                $stringSelected[$k] = $v;
            }
        }

        return [$boolSelected, $stringSelected];
    }

    private function findOverlappingReservation(
        string $dateOfUse,
        string $start,
        string $end,
        array $boolVenues,
        array $stringVenues,
        ?int $ignoreReservationId = null,
        array $statuses = ['approved']
    ): ?Reservation {
        if (empty($boolVenues) && empty($stringVenues)) {
            return null;
        }

        $q = Reservation::query()
            ->whereDate('date_of_use', $dateOfUse)
            ->whereIn('status', $statuses)
            ->where('inclusive_time_start', '<', $end)
            ->where('inclusive_time_end', '>', $start)
            ->where(function ($sub) use ($boolVenues, $stringVenues) {
                foreach ($boolVenues as $k) {
                    $sub->orWhere($k, true);
                }
                foreach ($stringVenues as $k => $v) {
                    $sub->orWhere($k, $v);
                }
            });

        if ($ignoreReservationId) {
            $q->where('id', '!=', $ignoreReservationId);
        }

        return $q->orderBy('id', 'desc')->first();
    }

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
                'id', 'status', 'activity_event', 'date_of_use', 'inclusive_time_start', 'inclusive_time_end', 'category_id',
                'wifi_preference',
                'pax_count',
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
            'pax_count' => 'nullable|integer|min:0',
            'date_of_use' => 'required|date|after_or_equal:today',
            'inclusive_time_start' => 'required|date_format:H:i',
            'inclusive_time_end' => 'required|date_format:H:i',
            'category_id' => 'required|exists:categories,id',
            'wifi_preference' => 'nullable|in:wifi,no_wifi',
            // Add other validations as needed
        ]);

        $start = (string) $request->input('inclusive_time_start');
        $end = (string) $request->input('inclusive_time_end');
        if ($start >= $end) {
            return response()->json(['message' => 'Inclusive time end must be after start.'], 422);
        }

        [$boolVenues, $stringVenues] = $this->extractRequestedVenues($request);
        $conflict = $this->findOverlappingReservation(
            (string) $request->input('date_of_use'),
            $start,
            $end,
            $boolVenues,
            $stringVenues,
            null,
            ['approved', 'pending']
        );
        if ($conflict) {
            return response()->json([
                'message' => 'The selected time overlaps with an existing reservation for the same venue.',
                'conflict_reservation_id' => $conflict->id,
            ], 422);
        }

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

        $rules = [];
        if ($request->has('or_number')) {
            $rules['or_number'] = 'nullable|regex:/^[0-9]+$/';
        }
        if ($request->has('or_amount')) {
            $rules['or_amount'] = 'nullable|regex:/^[0-9]+(\.[0-9]{1,2})?$/';
        }
        if ($request->has('or_date')) {
            $rules['or_date'] = 'nullable|date';
        }
        if ($request->has('inclusive_time_start')) {
            $rules['inclusive_time_start'] = 'required|date_format:H:i';
        }
        if ($request->has('inclusive_time_end')) {
            $rules['inclusive_time_end'] = 'required|date_format:H:i';
        }
        if ($request->has('date_of_use')) {
            $rules['date_of_use'] = 'required|date|after_or_equal:today';
        }
        if ($request->has('pax_count')) {
            $rules['pax_count'] = 'nullable|integer|min:0';
        }
        if ($request->has('wifi_preference')) {
            $rules['wifi_preference'] = 'nullable|in:wifi,no_wifi';
        }
        if (!empty($rules)) {
            $request->validate($rules);
        }

        $dateOfUse = (string) ($request->input('date_of_use') ?? $reservation->date_of_use?->format('Y-m-d') ?? $reservation->date_of_use);
        $start = (string) ($request->input('inclusive_time_start') ?? $reservation->inclusive_time_start);
        $end = (string) ($request->input('inclusive_time_end') ?? $reservation->inclusive_time_end);
        if ($start && $end && $start >= $end) {
            return response()->json(['message' => 'Inclusive time end must be after start.'], 422);
        }

        [$boolVenues, $stringVenues] = $this->extractRequestedVenues($request, $reservation);
        $conflict = $this->findOverlappingReservation(
            $dateOfUse,
            $start,
            $end,
            $boolVenues,
            $stringVenues,
            (int) $reservation->id,
            ['approved', 'pending']
        );
        if ($conflict) {
            return response()->json([
                'message' => 'The selected time overlaps with an existing reservation for the same venue.',
                'conflict_reservation_id' => $conflict->id,
            ], 422);
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

        if ($request->status === 'approved') {
            $dateOfUse = (string) ($reservation->date_of_use?->format('Y-m-d') ?? $reservation->date_of_use);
            $start = (string) $reservation->inclusive_time_start;
            $end = (string) $reservation->inclusive_time_end;
            [$boolVenues, $stringVenues] = $this->extractRequestedVenues(new Request(), $reservation);

            $conflict = $this->findOverlappingReservation(
                $dateOfUse,
                $start,
                $end,
                $boolVenues,
                $stringVenues,
                (int) $reservation->id
            );
            if ($conflict) {
                return response()->json([
                    'message' => 'Cannot approve: this reservation overlaps with an already approved reservation for the same venue.',
                    'conflict_reservation_id' => $conflict->id,
                ], 422);
            }
        }

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
            'pax_count' => 'nullable|integer|min:0',
            'venue_name' => 'nullable|string',
            'venue_key' => 'nullable|string',
            'selected_audio' => 'array',
            'selected_video' => 'array',
            'selected_lighting' => 'array',
            'audio_details' => 'array',
            'video_details' => 'array',
            'lighting_details' => 'array',
            'wifi_preference' => 'nullable|in:wifi,no_wifi',
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
