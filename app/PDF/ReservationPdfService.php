<?php

namespace App\PDF;

use TCPDF;

class ReservationPdfService
{
    /**
     * Generate the Reservation PDF.
     *
     * @param array $data
     * @return string PDF binary content
     * @throws \Exception
     */
    public function generate($data)
    {
        // 1. Extract and sanitize input data
        $activity    = e($data['activity_event'] ?? '');
        $party       = e($data['requesting_party'] ?? '');
        $requestedBy = e($data['requested_by'] ?? '');
        $dateOfUse   = e($data['date_of_use'] ?? '');
        $time        = e(($data['inclusive_time_start'] ?? '') . ' - ' . ($data['inclusive_time_end'] ?? ''));
        $orNumber    = e($data['or_number'] ?? '');
        $amount      = e($data['amount'] ?? '');
        $orDate      = e($data['or_date'] ?? '');
        
        $venueName   = strtolower($data['venue_name'] ?? '');
        $venueKey    = strtolower($data['venue_key'] ?? '');
        
        $selectedAudio    = $data['selected_audio'] ?? [];
        $selectedVideo    = $data['selected_video'] ?? [];
        $selectedLighting = $data['selected_lighting'] ?? [];
        
        $audioDetails    = $data['audio_details'] ?? [];
        $videoDetails    = $data['video_details'] ?? [];
        $lightingDetails = $data['lighting_details'] ?? [];

        // 2. Helper functions for conditional logic in the template
        $isSelected = function ($label) use ($venueName, $venueKey) {
            $l = strtolower($label);
            return ($venueName && (str_contains($venueName, $l) || str_contains($l, $venueName)))
                || ($venueKey && (str_contains($venueKey, $l) || str_contains($l, $venueKey)));
        };

        $tickMark = '<font face="zapfdingbats">4</font>';
        $check = fn ($label) => $isSelected($label) ? $tickMark : '&nbsp;';

        // 3. Helper to render AV System tables
        $renderAVTable = function (array $items, array $selected, array $details) {
            $rows = '';
            foreach ($items as $it) {
                $tick = in_array($it, $selected) ? '<font face="zapfdingbats">4</font>' : '&nbsp;';
                $qty = isset($details[$it]['qty']) ? e($details[$it]['qty']) : '';
                $remarks = isset($details[$it]['remarks']) ? e($details[$it]['remarks']) : '';
                $rows .= "
                <tr>
                    <td width=\"50%\" align=\"left\">(<span style=\"display:inline-block; width:4mm; text-align:center;\">{$tick}</span>) {$it}</td>
                    <td width=\"18%\" align=\"center\" style=\"border-bottom:1px solid #000;\">{$qty}</td>
                    <td width=\"32%\" style=\"border-bottom:1px solid #000;\">{$remarks}</td>
                </tr>";
            }
            return <<<HTML
            <table border="0" cellpadding="2" cellspacing="0" width="100%">
                <tr>
                    <th align="left" width="50%"></th>
                    <th align="center" width="18%">Qty</th>
                    <th align="left" width="32%">Remarks</th>
                </tr>
                {$rows}
            </table>
HTML;
        };

        $audioHtml    = $renderAVTable(['Amplifier','Speaker','Microphone','Others'], $selectedAudio, $audioDetails);
        $videoHtml    = $renderAVTable(['Video Showing','Video Editing','Video Coverage','Others'], $selectedVideo, $videoDetails);
        $lightingHtml = $renderAVTable(['Follow Spot','House Light','Electric Fans','Others'], $selectedLighting, $lightingDetails);

        $logoPath = str_replace('\\', '/', public_path('assets/LNULogo.png'));
        $tcpdfFontCachePath = storage_path('tcpdf-fonts');
        if (!is_dir($tcpdfFontCachePath)) {
            @mkdir($tcpdfFontCachePath, 0755, true);
        }

        $bahnschriftFont = 'helvetica';
        $calibriFont = 'helvetica';
        $arialFont = 'helvetica';
        $arialBoldFont = 'helvetica';
        try {
            $bahnschriftFont = \TCPDF_FONTS::addTTFfont(public_path('fonts/Bahnschrift/bahnschrift.ttf'), 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $bahnschriftFont;
            $calibriFont = \TCPDF_FONTS::addTTFfont(public_path('fonts/Calibri Regular (Body)/calibri.ttf'), 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $calibriFont;
            $arialFont = \TCPDF_FONTS::addTTFfont(public_path('fonts/Arial/arial.ttf'), 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $arialFont;
            $arialBoldFont = \TCPDF_FONTS::addTTFfont(public_path('fonts/Arial/arialbd.ttf'), 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $arialBoldFont;
        } catch (\Throwable $e) {
        }

        // 4. The HTML Template (One Copy)
        // Using HEREDOC for easier editing. You can directly edit the HTML/CSS below.
        $htmlOneCopy = <<<HTML
        <style>
          body { font-family: helvetica, Arial, sans-serif; font-size: 10pt; }
          .box { border:1px solid #000; padding:6px; }
          .tick { display:inline-block; width:4mm; text-align:center; }
          .small { font-size:9pt; }
          .border-bottom { border-bottom:1px solid #000; }
          .rph { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .lnu { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .city { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .ppf { text-align:center; line-height: 11pt; margin:0; padding:0; }
          .formtitle { text-align:center; line-height: 11pt; margin:0; padding:0; }
        </style>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="16%" align="right" valign="top" style="padding-top:1mm; padding-right:1mm;">
              <img src="{$logoPath}" style="width:23.3mm; height:23mm;" />
            </td>
            <td width="60%" align="center" valign="top" style="padding-top:0.5mm;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center"><font face="{$bahnschriftFont}" size="12"><span style="font-weight:600;">Republic of the Philippines</span></font></td>
                </tr>
                <tr>
                  <td align="center" style="height:0.8mm; line-height:0.8mm; font-size:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center"><font face="{$bahnschriftFont}" size="12"><b>LEYTE NORMAL UNIVERSITY</b></font></td>
                </tr>
                <tr>
                  <td align="center"><font face="{$calibriFont}" size="12">Tacloban City</font></td>
                </tr>
                <tr>
                  <td align="center" style="height:0.8mm; line-height:0.8mm; font-size:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center"><font face="{$arialBoldFont}" size="11"><b>PHYSICAL PLANT AND FACILITIES</b></font></td>
                </tr>
                <tr>
                  <td align="center"><font face="{$arialBoldFont}" size="11">VENUE AND AUDIO-VISUAL FACILITIES RESERVATION FORM</font></td>
                </tr>
              </table>
            </td>
            <td width="50%" valign="top" style="padding-top:1mm;">
              <table border="0.5" cellpadding="1" cellspacing="0" style="width:5.21cm; height:2.09cm;">
                <tr>
                  <td valign="top" style="height:2.09cm;">
                    <table border="0" cellpadding="1" cellspacing="0" width="100%" style="height:100%; margin-left:100mm;">
                      <tr>
                        <td width="46%"><font face="{$calibriFont}" size="11">OR Number:</font></td>
                        <td style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="11">{$orNumber}&nbsp;</font></td>
                      </tr>
                      <tr>
                        <td><font face="{$calibriFont}" size="11">Amount:</font></td>
                        <td style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="11">{$amount}&nbsp;</font></td>
                      </tr>
                      <tr>
                        <td><font face="{$calibriFont}" size="11">Date:</font></td>
                        <td style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="11">{$orDate}&nbsp;</font></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="height:2mm; line-height:2mm; font-size:1px;">&nbsp;</div>

        <table width="100%" cellpadding="2" cellspacing="0">
          <tr>
            <td width="58%" valign="top">
              <table width="100%" cellpadding="1" cellspacing="0">
                <tr>
                  <td width="32%"><font face="{$arialFont}" size="11">Activity/Event:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="11">{$activity}</font></td>
                </tr>
                <tr>
                  <td><font face="{$arialFont}" size="11">Requesting Party:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="11">{$party}</font></td>
                </tr>
              </table>
            </td>
            <td width="42%" valign="top">
              <table width="100%" cellpadding="1" cellspacing="0">
                <tr>
                  <td width="40%"><font face="{$arialFont}" size="11">Date of Use:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="11">{$dateOfUse}</font></td>
                </tr>
                <tr>
                  <td><font face="{$arialFont}" size="11">Inclusive Time:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="11">{$time}</font></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <br/>
        <div style="text-align:center; font-weight:bold; font-size:10pt;">VENUE REQUESTED</div>
        <table width="100%" cellpadding="1" cellspacing="0" style="font-size:9pt;">
          <tr>
            <td width="63%" valign="top">
              (<span class="tick">{$check('HRDC Hall')}</span>) HRDC Hall&nbsp;&nbsp;
              (<span class="tick">{$check('AV Studio')}</span>) AV Studio&nbsp;&nbsp;
              (<span class="tick">{$check('Bleacher')}</span>) Bleacher&nbsp;&nbsp;
              (<span class="tick">{$check('Alba Hall')}</span>) Alba Hall
              <br/>
              (<span class="tick">{$check('Student Center Mini-Theater')}</span>) Student Center Mini-Theater
              <br/>
              (<span class="tick">{$check('CTE Training Hall')}</span>) CTE Training Hall 2
              <span style="display:inline-block; border-bottom:1px solid #000; min-width:18px;">&nbsp;</span>
              or
              <span style="display:inline-block; border-bottom:1px solid #000; min-width:18px;">&nbsp;</span>
              3 (specify)
              <br/>
              (<span class="tick">{$check('Admin Ballroom 2F')}</span>) Admin Ballroom 2F&nbsp;&nbsp;
              (<span class="tick">{$check('Multi-Purpose Hall 3F')}</span>) Multi-Purpose Hall 3F
              <br/>
              (<span class="tick">{$check('Hum. AV Theater')}</span>) Hum. AV Theater&nbsp;&nbsp;
              (<span class="tick">{$check('Dance Studio')}</span>) Dance Studio
              <br/>
              (<span class="tick">{$check('CME Gym')}</span>) CME Gym
            </td>
            <td width="37%" valign="top">
              (<span class="tick">{$check('Classroom')}</span>) Classroom
              <span style="display:inline-block; border-bottom:1px solid #000; min-width:70px;">&nbsp;</span>
              (specify)
              <br/>
              (<span class="tick">{$check('Laboratory Room')}</span>) Laboratory Room
              <span style="display:inline-block; border-bottom:1px solid #000; min-width:55px;">&nbsp;</span>
              (specify)
              <br/>
              (<span class="tick">{$check('Library Grounds')}</span>) Library Grounds
              <br/>
              (<span class="tick">{$check('ORC Quadrangle')}</span>) ORC Quadrangle/Stage
              <br/>
              (<span class="tick">{$check('Others')}</span>) Others
              <span style="display:inline-block; border-bottom:1px solid #000; min-width:85px;">&nbsp;</span>
              (specify)
            </td>
          </tr>
        </table>

        <br/>
        <div style="text-align:center; font-weight:bold; font-size:10pt;">AUDIO-VISUAL FACILITIES</div>
        <table width="100%" cellpadding="2" cellspacing="0" style="font-size:9pt;">
          <tr>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">AUDIO SYSTEM</div>
              {$audioHtml}
            </td>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">VIDEO SYSTEM</div>
              {$videoHtml}
            </td>
            <td width="34%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:2px;">LIGHTING SYSTEM / FANS</div>
              {$lightingHtml}
            </td>
          </tr>
        </table>

        <br/>
        <table width="100%" cellpadding="2" cellspacing="0" style="font-size:9pt;">
          <tr>
            <td width="33%" valign="top" align="left">
              <div style="margin-bottom:8px;">Requested by:</div>
              <div style="border-bottom:1px solid #000; height:18px;">&nbsp;</div>
              <div style="text-align:center;">{$requestedBy}&nbsp;</div>
              <div class="small" style="text-align:center;">Requesting Party (Signature Over Printed Name)</div>
            </td>
            <td width="34%" valign="top" align="center">
              <div style="margin-bottom:4px;">Certification of Availability of Equipment:</div>
              <div style="border-bottom:1px solid #000; height:18px; width:80%; margin:0 auto;">&nbsp;</div>
              <div class="small" style="margin-top:2px;">HRDC Audio-Visual Coordinator</div>
              <br/>
              <div style="margin-bottom:4px;">Recommending Approval:</div>
              <div style="border-bottom:1px solid #000; height:18px; width:90%; margin:0 auto;">&nbsp;</div>
              <div class="small" style="margin-top:2px;">Building Coordinator (Signature Over Printed Name)</div>
            </td>
            <td width="33%" valign="top" align="center">
              <table border="1" cellpadding="6" cellspacing="0" width="100%">
                <tr><td align="left"><b>Approved by:</b></td></tr>
                <tr><td><div style="border-bottom:1px solid #000; height:18px;">&nbsp;</div></td></tr>
                <tr><td align="left" class="small">Director, Physical Plant & Facilities</td></tr>
                <tr><td align="left"><b>DATE RECEIVED</b> <span style="display:inline-block; border-bottom:1px solid #000; min-width:95px;">&nbsp;</span></td></tr>
              </table>
            </td>
          </tr>
        </table>

        <br/>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left"><b>F-PPF-001 (09-02-19)</b></td>
          </tr>
        </table>
HTML;

        // 5. Generate final HTML (Duplicate for 2 copies on one page if needed)
        $html = $htmlOneCopy;

        // 6. TCPDF Generation
        if (!class_exists(TCPDF::class)) {
            throw new \Exception('TCPDF is not installed. Run: composer require tecnickcom/tcpdf');
        }

        $pdf = new TCPDF('P', 'mm', [215.9, 330.2], true, 'UTF-8', false);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetCreator('VenueVisor');
        $pdf->SetAuthor('VenueVisor');
        $pdf->SetTitle('Reservation Form');
        $pdf->SetMargins(12.7, 4.8, 8.0, true);
        $pdf->SetAutoPageBreak(true, 1.6);
        $pdf->AddPage();
        $pdf->writeHTML($html, true, false, true, false, '');

        return $pdf->Output('ReservationForm.pdf', 'S');
    }
}
