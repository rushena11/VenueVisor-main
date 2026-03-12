<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    public function formPdf(Request $request)
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

        $activity = e($request->input('activity_event'));
        $party = e($request->input('requesting_party'));
        $requestedBy = e($request->input('requested_by', ''));
        $dateOfUse = e($request->input('date_of_use'));
        $time = e($request->input('inclusive_time_start') . ' - ' . $request->input('inclusive_time_end'));
        $orNumber = e($request->input('or_number', ''));
        $amount = e($request->input('amount', ''));
        $orDate = e($request->input('or_date', ''));
        $venueName = strtolower($request->input('venue_name', ''));
        $venueKey = strtolower($request->input('venue_key', ''));
        $selectedAudio = $request->input('selected_audio', []);
        $selectedVideo = $request->input('selected_video', []);
        $selectedLighting = $request->input('selected_lighting', []);
        $audioDetails = $request->input('audio_details', []);
        $videoDetails = $request->input('video_details', []);
        $lightingDetails = $request->input('lighting_details', []);

        $isSelected = function ($label) use ($venueName, $venueKey) {
            $l = strtolower($label);
            return $venueName && (str_contains($venueName, $l) || str_contains($l, $venueName))
                || $venueKey && (str_contains($venueKey, $l) || str_contains($l, $venueKey));
        };

        $check = fn ($label) => $isSelected($label) ? '✓' : '&nbsp;';

        $renderAVTable = function (array $items, array $selected, array $details) {
            $rows = '';
            foreach ($items as $it) {
                $tick = in_array($it, $selected) ? '✓' : '&nbsp;';
                $qty = isset($details[$it]['qty']) ? e($details[$it]['qty']) : '';
                $remarks = isset($details[$it]['remarks']) ? e($details[$it]['remarks']) : '';
                $rows .= '<tr>
                    <td width="55%"><span style="font-weight:bold; display:inline-block; width:14px; text-align:center;">'.$tick.'</span> '.$it.'</td>
                    <td width="15%" align="center" style="border-bottom:1px solid #000;">'.$qty.'</td>
                    <td width="30%" style="border-bottom:1px solid #000;">'.$remarks.'</td>
                </tr>';
            }
            return '<table border="0" cellpadding="2" cellspacing="0" width="100%">
                <tr><th align="left" width="55%"></th><th align="center" width="15%">Qty</th><th align="left" width="30%">Remarks</th></tr>'
                .$rows.
            '</table>';
        };

        $audioHtml = $renderAVTable(['Amplifier','Speaker','Microphone','Others'], $selectedAudio, $audioDetails);
        $videoHtml = $renderAVTable(['Video Showing','Video Editing','Video Coverage','Others'], $selectedVideo, $videoDetails);
        $lightingHtml = $renderAVTable(['Follow Spot','House Light','Electric Fans','Others'], $selectedLighting, $lightingDetails);

        $htmlOneCopy = '
        <style>
          body { font-family: helvetica, Arial, sans-serif; font-size: 10pt; }
          .title { text-align:center; font-weight:bold; font-size: 12pt; }
          .subtitle { text-align:center; font-weight:bold; }
          .box { border:1px solid #000; padding:6px; }
          .tick { font-weight:bold; display:inline-block; width:14px; text-align:center; }
          .small { font-size:9pt; }
        </style>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <div class="title">LEYTE NORMAL UNIVERSITY</div>
              <div class="subtitle">PHYSICAL PLANT AND FACILITIES</div>
              <div class="subtitle" style="margin-bottom:6px;">VENUE AND AUDIO-VISUAL FACILITIES RESERVATION FORM</div>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="2" cellspacing="0">
          <tr>
            <td width="63%">
              <table width="100%" cellpadding="2" cellspacing="0">
                <tr><td width="35%"><b>Activity/Event:</b></td><td style="border-bottom:1px solid #000;">'.$activity.'</td></tr>
                <tr><td><b>Date of Use:</b></td><td style="border-bottom:1px solid #000;">'.$dateOfUse.'</td></tr>
                <tr><td><b>Requesting Party:</b></td><td style="border-bottom:1px solid #000;">'.$party.'</td></tr>
                <tr><td><b>Inclusive Time:</b></td><td style="border-bottom:1px solid #000;">'.$time.'</td></tr>
              </table>
            </td>
            <td width="37%" align="right" valign="top">
              <table class="box" width="100%" cellpadding="2" cellspacing="0">
                <tr><td><b>OR Number:</b> '.$orNumber.'</td></tr>
                <tr><td><b>Amount:</b> '.$amount.'</td></tr>
                <tr><td><b>Date:</b> '.$orDate.'</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <br/>
        <div class="small" style="font-weight:bold; text-align:center;">VENUE REQUESTED</div>
        <table width="100%" cellpadding="1" cellspacing="0">
          <tr>
            <td width="50%" valign="top">
              ( <span class="tick">'.$check('HRDC Hall').'</span> ) HRDC Hall<br/>
              ( <span class="tick">'.$check('AV Studio').'</span> ) AV Studio<br/>
              ( <span class="tick">'.$check('Bleacher').'</span> ) Bleacher<br/>
              ( <span class="tick">'.$check('Alba Hall').'</span> ) Alba Hall<br/>
              ( <span class="tick">'.$check('Student Center Mini-Theater').'</span> ) Student Center Mini-Theater<br/>
              ( <span class="tick">'.($isSelected('CTE Training Hall') || $isSelected('CTE Training Hall 2') ? '✓' : '&nbsp;').'</span> ) CTE Training Hall 2/3<br/>
              ( <span class="tick">'.$check('Admin Ballroom 2F').'</span> ) Admin Ballroom 2F<br/>
              ( <span class="tick">'.$check('Multi-Purpose Hall 3F').'</span> ) Multi-Purpose Hall 3F<br/>
            </td>
            <td width="50%" valign="top">
              ( <span class="tick">'.$check('Hum. AV Theater').'</span> ) Hum. AV Theater<br/>
              ( <span class="tick">'.$check('Dance Studio').'</span> ) Dance Studio<br/>
              ( <span class="tick">'.$check('CME Gym').'</span> ) CME Gym<br/>
              ( <span class="tick">'.$check('Classroom').'</span> ) Classroom (specify) ____________<br/>
              ( <span class="tick">'.$check('Laboratory Room').'</span> ) Laboratory Room (specify) ____________<br/>
              ( <span class="tick">'.$check('Library Grounds').'</span> ) Library Grounds<br/>
              ( <span class="tick">'.($isSelected('ORC Quadrangle') || $isSelected('ORC Quadrangle/Stage') ? '✓' : '&nbsp;').'</span> ) ORC Quadrangle/Stage<br/>
              ( <span class="tick">'.$check('Others').'</span> ) Others (specify) ____________<br/>
            </td>
          </tr>
        </table>

        <br/>
        <table width="100%" cellpadding="2" cellspacing="0">
          <tr>
            <td width="33%" valign="top">
              <div style="text-align:center;">
                <div style="border-bottom:1px solid #000; height:18px;">'.$requestedBy.'</div>
                <div class="small">Requesting Party (Signature Over Printed Name)</div>
              </div>
            </td>
            <td width="34%" valign="top" align="center">
              <div style="text-align:center;">
                <div class="small">Certification of Availability of Equipment:</div>
                <div style="border-bottom:1px solid #000; height:18px;"></div>
                <div class="small">HRDC Audio-Visual Coordinator</div>
                <br/>
                <div class="small">Recommending Approval:</div>
                <div style="border-bottom:1px solid #000; height:18px;"></div>
                <div class="small">Building Coordinator (Signature Over Printed Name)</div>
              </div>
            </td>
            <td width="33%" valign="top" align="center">
              <table class="box" width="100%" cellpadding="2" cellspacing="0">
                <tr><td align="left"><b>Approved by:</b></td></tr>
                <tr><td><div style="border-bottom:1px solid #000; height:18px;"></div></td></tr>
                <tr><td align="center" class="small">Director, Physical Plant & Facilities</td></tr>
                <tr><td><span class="small"><b>DATE RECEIVED:</b></span> <span style="display:inline-block; border-bottom:1px solid #000; min-width:120px;">&nbsp;</span></td></tr>
              </table>
            </td>
          </tr>
        </table>

        <br/>
        <table width="100%"><tr><td align="left"><b>F-PPF-001 (09-02-19)</b></td></tr></table>

        <br/>
        <table width="100%" cellpadding="2" cellspacing="0">
          <tr>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">AUDIO SYSTEM</div>'.$audioHtml.'
            </td>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">VIDEO SYSTEM</div>'.$videoHtml.'
            </td>
            <td width="34%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">LIGHTING SYSTEM / FANS</div>'.$lightingHtml.'
            </td>
          </tr>
        </table>
        ';

        $html = $htmlOneCopy . '<hr/>' . $htmlOneCopy;

        if (!class_exists(\TCPDF::class)) {
            return response()->json([
                'message' => 'TCPDF is not installed on the server. Please install tecnickcom/tcpdf via Composer.'
            ], 500);
        }
        $pdf = new \TCPDF('P', 'mm', [215.9, 330.2], true, 'UTF-8', false);
        $pdf->SetCreator('VenueVisor');
        $pdf->SetAuthor('VenueVisor');
        $pdf->SetTitle('Reservation Form');
        $pdf->SetMargins(10, 10, 10, true);
        $pdf->SetAutoPageBreak(true, 12);
        $pdf->AddPage();
        $pdf->writeHTML($html, true, false, true, false, '');

        $content = $pdf->Output('ReservationForm.pdf', 'S');
        return response($content, 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ReservationForm.pdf"');
    }
}
