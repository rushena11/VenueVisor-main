<?php

namespace App\PDF;

use TCPDF;
use setasign\Fpdi\Tcpdf\Fpdi;

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
        $candidateTemplatePaths = [
            public_path('form/revised-VENUE-RESERVATION-FORM-2026.pdf'),
            public_path('assets/ReservationForm.pdf'),
            public_path('assets/ReservationFormTemplate.pdf'),
            public_path('templates/ReservationForm.pdf'),
            public_path('templates/ReservationFormTemplate.pdf'),
        ];

        foreach ($candidateTemplatePaths as $path) {
            if (is_file($path)) {
                return $this->generateFromPdfTemplate($path, $data);
            }
        }

        $formatDateLong = function ($value) {
            if (!$value) return '';
            try {
                $s = is_string($value) ? trim($value) : $value;
                if ($s === '') return '';
                if (is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
                    $dt = \DateTime::createFromFormat('!Y-m-d', $s, new \DateTimeZone('Asia/Manila'));
                } else {
                    $dt = new \DateTime(is_string($s) ? $s : 'now', new \DateTimeZone('Asia/Manila'));
                    if (is_string($s)) {
                        $dt->modify($s);
                    }
                }
                if (!$dt) return is_string($value) ? $value : '';
                return $dt->format('F j, Y');
            } catch (\Throwable $e) {
                return is_string($value) ? $value : '';
            }
        };

        // 1. Extract and sanitize input data
        $activity    = e($data['activity_event'] ?? '');
        $party       = e($data['requesting_party'] ?? '');
        $requestedBy = e($data['requested_by'] ?? '');
        $dateOfUse   = e($formatDateLong($data['date_of_use'] ?? ''));
        $time        = e(($data['inclusive_time_start'] ?? '') . ' - ' . ($data['inclusive_time_end'] ?? ''));
        $orNumber    = e($data['or_number'] ?? '');
        $amount      = e($data['amount'] ?? '');
        $orDate      = e($formatDateLong($data['or_date'] ?? ''));
        
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
                    <td width=\"32%\" style=\"border-bottom:1px solid #000; border-left:1px solid transparent; margin-left:1mm;\">{$remarks}</td>
                </tr>";
            }
            return <<<HTML
            <table border="0" cellpadding="1" cellspacing="0" width="100%">
                <tr>
                    <th align="left" width="50%"></th>
                    <th align="center" width="18%" style="border-bottom:1px solid #000; font-size:8pt;">Qty</th>
                    <th align="center" width="32%" style="border-bottom:1px solid #000; font-size:8pt;">Remarks</th>
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

        $fontsBasePath = public_path('fonts');
        $preferredFontPath = null;
        $explicitPreferred = [
            $fontsBasePath . DIRECTORY_SEPARATOR . 'ReservationForm.ttf',
            $fontsBasePath . DIRECTORY_SEPARATOR . 'ReservationForm.otf',
        ];
        foreach ($explicitPreferred as $p) {
            if (is_file($p)) {
                $preferredFontPath = $p;
                break;
            }
        }

        if (!$preferredFontPath) {
            $bahnschriftPath = $fontsBasePath . DIRECTORY_SEPARATOR . 'Bahnschrift' . DIRECTORY_SEPARATOR . 'bahnschrift.ttf';
            if (is_file($bahnschriftPath)) {
                $preferredFontPath = $bahnschriftPath;
            }
        }
        
        $calibriPath = $fontsBasePath . DIRECTORY_SEPARATOR . 'Calibri Regular (Body)' . DIRECTORY_SEPARATOR . 'calibri.ttf';
        $arialPath = $fontsBasePath . DIRECTORY_SEPARATOR . 'Arial' . DIRECTORY_SEPARATOR . 'arial.ttf';
        $arialBoldPath = $fontsBasePath . DIRECTORY_SEPARATOR . 'Arial' . DIRECTORY_SEPARATOR . 'arialbd.ttf';

        try {
            if ($preferredFontPath) {
                $bahnschriftFont = \TCPDF_FONTS::addTTFfont($preferredFontPath, 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $bahnschriftFont;
            }
            if (is_file($calibriPath)) {
                $calibriFont = \TCPDF_FONTS::addTTFfont($calibriPath, 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $calibriFont;
            }
            if (is_file($arialPath)) {
                $arialFont = \TCPDF_FONTS::addTTFfont($arialPath, 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $arialFont;
            }
            if (is_file($arialBoldPath)) {
                $arialBoldFont = \TCPDF_FONTS::addTTFfont($arialBoldPath, 'TrueTypeUnicode', '', 32, $tcpdfFontCachePath) ?: $arialBoldFont;
            }
        } catch (\Throwable $e) {
        }
        
        if ($preferredFontPath && $bahnschriftFont === 'helvetica') {
            throw new \Exception('Failed to load the uploaded font: ' . str_replace('\\', '/', $preferredFontPath));
        }
        if (is_file($calibriPath) && $calibriFont === 'helvetica') {
            throw new \Exception('Failed to load the uploaded font: ' . str_replace('\\', '/', $calibriPath));
        }
        if (is_file($arialPath) && $arialFont === 'helvetica') {
            throw new \Exception('Failed to load the uploaded font: ' . str_replace('\\', '/', $arialPath));
        }
        if (is_file($arialBoldPath) && $arialBoldFont === 'helvetica') {
            throw new \Exception('Failed to load the uploaded font: ' . str_replace('\\', '/', $arialBoldPath));
        }

        // 4. The HTML Template (One Copy)
        // Using HEREDOC for easier editing. You can directly edit the HTML/CSS below.
        $htmlOneCopy = <<<HTML
        <style>
          body { font-family: {$bahnschriftFont}, helvetica, Arial, sans-serif; font-size: 9pt; }
          .box { border:1px solid #000; padding:4px; }
          .tick { display:inline-block; width:4mm; text-align:center; }
          .small { font-size:8.5pt; }
          .border-bottom { border-bottom:1px solid #000; }
          .rph { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .lnu { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .city { text-align:center; line-height: 12pt; margin:0; padding:0; }
          .ppf { text-align:center; line-height: 11pt; margin:0; padding:0; }
          .formtitle { text-align:center; line-height: 11pt; margin:0; padding:0; }
        </style>
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="25%" align="left" valign="top" style="padding-top:0mm; padding-left:25.1mm;">
              <img src="{$logoPath}" style="width:23mm; height:22.5mm; margin-top:-1.9mm;" />
            </td>
            <td width="50%" align="center" valign="top" style="padding-top:0.5mm;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center"><font face="{$bahnschriftFont}" size="12">Republic of the Philippines</font></td>
                </tr>
                <tr>
                  <td align="center"><font face="{$bahnschriftFont}" size="12"><b>LEYTE NORMAL UNIVERSITY</b></font></td>
                </tr>
                <tr>
                  <td align="center"><font face="{$calibriFont}" size="12">Tacloban City</font></td>
                </tr>
                <tr>
                  <td align="center" style="height:1mm; line-height:1mm; font-size:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center"><font face="{$arialBoldFont}" size="11"><b>PHYSICAL PLANT AND FACILITIES</b></font></td>
                </tr>
                <tr>
                  <td align="center" style="white-space:nowrap;"><font face="{$arialBoldFont}" size="11" stretch="90"><b>VENUE AND AUDIO-VISUAL FACILITIES RESERVATION FORM</b></font></td>
                </tr>
              </table>
            </td>
            <td width="25%" valign="top" style="padding-top:0.1mm;">
              <table border="0.8" cellpadding="1" cellspacing="0" style="width:5.21cm; height:1.9cm;">
                <tr>
                  <td valign="top" style="height:2.09cm;">
                    <table border="0" cellpadding="1" cellspacing="0" width="100%">
                      <tr>
                        <td width="48%"><font face="{$calibriFont}" size="10">OR Number:</font></td>
                        <td width="47%" style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="10">{$orNumber}&nbsp;</font></td>
                      </tr>
                      <tr>
                        <td><font face="{$calibriFont}" size="10">Amount:</font></td>
                        <td style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="10">{$amount}&nbsp;</font></td>
                      </tr>
                      <tr>
                        <td><font face="{$calibriFont}" size="10">Date:</font></td>
                        <td style="border-bottom:1px solid #000;"><font face="{$calibriFont}" size="10">{$orDate}&nbsp;</font></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="height:1.5mm; line-height:1.5mm; font-size:1px;">&nbsp;</div>

        <table width="100%" cellpadding="2" cellspacing="0">
          <tr>
            <td width="60%" valign="top">
              <table width="100%" cellpadding="1" cellspacing="0">
                <tr>
                  <td width="28%"><font face="{$arialFont}" size="10">Activity/Event:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="10">{$activity}</font></td>
                </tr>
                <tr>
                  <td><font face="{$arialFont}" size="10">Requesting Party:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="10">{$party}</font></td>
                </tr>
              </table>
            </td>
            <td width="40%" valign="top">
              <table width="100%" cellpadding="1" cellspacing="0">
                <tr>
                  <td width="38%"><font face="{$arialFont}" size="10">Date of Use:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="10">{$dateOfUse}</font></td>
                </tr>
                <tr>
                  <td><font face="{$arialFont}" size="10">Inclusive Time:</font></td>
                  <td style="border-bottom:1px solid #000;"><font face="{$arialFont}" size="10">{$time}</font></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="height:1mm; line-height:0.5mm; font-size:1px;">&nbsp;</div>
        <div style="text-align:center; font-weight:bold; font-size:9.5pt;">VENUE REQUESTED</div>
        <table width="100%" cellpadding="1" cellspacing="0" style="font-size:8.5pt;">
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

        <div style="height:0.5mm; line-height:0.5mm; font-size:1px;">&nbsp;</div>
        <div style="text-align:center; font-weight:bold; font-size:9.5pt;">AUDIO-VISUAL FACILITIES</div>
        <table width="100%" cellpadding="1" cellspacing="0" style="font-size:8.5pt;">
          <tr>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:1px;">AUDIO SYSTEM</div>
              {$audioHtml}
            </td>
            <td width="33%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:1px;">VIDEO SYSTEM</div>
              {$videoHtml}
            </td>
            <td width="34%" valign="top" align="center">
              <div style="font-weight:bold; text-decoration:underline; margin-bottom:1px;">LIGHTING SYSTEM / FANS</div>
              {$lightingHtml}
            </td>
          </tr>
        </table>

        <div style="height:1mm; line-height:1mm; font-size:1px;">&nbsp;</div>
        <div style="text-align:center; font-size:9.5pt;">Certification of Availability of Equipment:</div>
        <div style="height:2.5mm;"></div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%"></td>
            <td width="28%" style="border-bottom:1px solid #000;"></td>
            <td width="33%"></td>
          </tr>
          <tr>
            <td></td>
            <td align="center" style="font-size:9pt;">HRDC Audio-Visual Coordinator</td>
            <td></td>
          </tr>
        </table>

        <div style="height:2.5mm;"></div>

        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:8.5pt;">
          <tr>
            <td width="32%" valign="top">
              <div style="margin-bottom:8mm;">Requested by:</div>
              <div style="border-bottom:1px solid #000; height:1px;"></div>
              <div style="text-align:center; font-weight:bold; margin-top:1px;">{$requestedBy}</div>
              <div style="text-align:center; font-size:8pt;">Requesting Party (Signature Over Printed Name)</div>
            </td>
            <td width="4%"></td>
            <td width="32%" valign="top">
              <div style="margin-bottom:5mm;">Recommending Approval:</div>
              <div style="border-bottom:1px solid #000; height:1px;"></div>
              <div style="text-align:center; margin-top:1px;">&nbsp;</div>
              <div style="text-align:center; font-size:8pt;">Building Coordinator (Signature Over Printed Name)</div>
            </td>
            <td width="4%"></td>
            <td width="28%" valign="top">
              <table border="1" cellpadding="3" cellspacing="0" width="100%">
                <tr><td align="left">Approved by:</td></tr>
                <tr><td height="10mm"></td></tr>
                <tr><td style="border-top:1px solid #000; font-size:8pt;" align="center">Director, Physical Plant & Facilities</td></tr>
                <tr><td align="left" style="font-size:8.5pt; font-weight:bold; border-top:1px solid #000;">DATE RECEIVED ________________</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="height:1mm; line-height:1mm; font-size:1px;">&nbsp;</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left"><b>F-PPF-001 (09-02-19)</b></td>
          </tr>
        </table>
HTML;

        // 5. Generate final HTML (Duplicate for 2 copies on one page)
        $separator = '<div style="border-top: 1px dashed #000; margin: 2mm 0; height: 1px; width: 100%; text-align: center; font-size: 7pt; color: #666;">(CUT HERE)</div>';
        $html = $htmlOneCopy . $separator . $htmlOneCopy;

        // 6. TCPDF Generation
        if (!class_exists(TCPDF::class)) {
            throw new \Exception('TCPDF is not installed. Run: composer require tecnickcom/tcpdf');
        }

        // Long Bond size: 8.5in x 13in (215.9mm x 330.2mm)
        $pdf = new TCPDF('P', 'mm', [215.9, 330.2], true, 'UTF-8', false);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetCreator('VenueVisor');
        $pdf->SetAuthor('VenueVisor');
        $pdf->SetTitle('Reservation Form');
        
        // Adjust margins to fit 2 copies
        $pdf->SetMargins(12.7, 4.8, 8.0, true);
        $pdf->SetAutoPageBreak(false, 1.6);
        $pdf->AddPage();
        $pdf->setCellHeightRatio(0.9);
        
        $pdf->writeHTML($html, true, false, true, false, '');

        return $pdf->Output('ReservationForm.pdf', 'S');
    }

    private function generateFromPdfTemplate(string $templatePath, array $data): string
    {
        if (!class_exists(Fpdi::class)) {
            throw new \Exception('PDF template autofill requires FPDI. Run: composer require setasign/fpdi-tcpdf');
        }

        $formatDateLong = function ($value) {
            if (!$value) return '';
            try {
                $s = is_string($value) ? trim($value) : $value;
                if ($s === '') return '';
                if (is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
                    $dt = \DateTime::createFromFormat('!Y-m-d', $s, new \DateTimeZone('Asia/Manila'));
                } else {
                    $dt = new \DateTime(is_string($s) ? $s : 'now', new \DateTimeZone('Asia/Manila'));
                    if (is_string($s)) {
                        $dt->modify($s);
                    }
                }
                if (!$dt) return is_string($value) ? $value : '';
                return $dt->format('F j, Y');
            } catch (\Throwable $e) {
                return is_string($value) ? $value : '';
            }
        };

        $clean = function ($value) {
            $s = is_scalar($value) ? (string) $value : '';
            $s = trim($s);
            $s = str_replace(["\r\n", "\r", "\n", "\t"], ' ', $s);
            return preg_replace('/\s+/', ' ', $s) ?? $s;
        };

        $activity = $clean($data['activity_event'] ?? '');
        $party = $clean($data['requesting_party'] ?? '');
        $requestedBy = $clean($data['requested_by'] ?? '');
        $dateOfUse = $clean($formatDateLong($data['date_of_use'] ?? ''));
        $time = $clean(($data['inclusive_time_start'] ?? '') . ' - ' . ($data['inclusive_time_end'] ?? ''));
        $orNumber = $clean($data['or_number'] ?? '');
        $amount = $clean($data['amount'] ?? '');
        $orDate = $clean($formatDateLong($data['or_date'] ?? ''));

        $venueName = strtolower($clean($data['venue_name'] ?? ''));
        $venueKey = strtolower($clean($data['venue_key'] ?? ''));

        $selectedAudio = is_array($data['selected_audio'] ?? null) ? $data['selected_audio'] : [];
        $selectedVideo = is_array($data['selected_video'] ?? null) ? $data['selected_video'] : [];
        $selectedLighting = is_array($data['selected_lighting'] ?? null) ? $data['selected_lighting'] : [];

        $audioDetails = is_array($data['audio_details'] ?? null) ? $data['audio_details'] : [];
        $videoDetails = is_array($data['video_details'] ?? null) ? $data['video_details'] : [];
        $lightingDetails = is_array($data['lighting_details'] ?? null) ? $data['lighting_details'] : [];

        $isSelected = function (string $label) use ($venueName, $venueKey) {
            $l = strtolower($label);
            return ($venueName && (str_contains($venueName, $l) || str_contains($l, $venueName)))
                || ($venueKey && (str_contains($venueKey, $l) || str_contains($l, $venueKey)));
        };

        $pdf = new Fpdi('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetCreator('VenueVisor');
        $pdf->SetAuthor('VenueVisor');
        $pdf->SetTitle('Reservation Form');
        $pdf->SetMargins(0, 0, 0, true);
        $pdf->SetAutoPageBreak(false, 0);

        $pageCount = $pdf->setSourceFile($templatePath);
        if ($pageCount < 1) {
            throw new \Exception('Template PDF has no pages: ' . str_replace('\\', '/', $templatePath));
        }

        $tplId = $pdf->importPage(1);
        $tplSize = $pdf->getTemplateSize($tplId);
        $pageW = (float) $tplSize['width'];
        $pageH = (float) $tplSize['height'];
        $orientation = $tplSize['orientation'] ?? 'P';

        $pdf->AddPage($orientation, [$pageW, $pageH]);
        $pdf->useTemplate($tplId, 0, 0, $pageW, $pageH);

        $copies = $pageH > 250 ? 2 : 1;
        $copyH = $pageH / $copies;
        $debug = !empty($data['debug_pdf_coordinates']);

        $drawDebugGrid = function (float $offsetY) use ($pdf, $pageW, $copyH) {
            $pdf->SetDrawColor(220, 220, 220);
            $pdf->SetTextColor(120, 120, 120);
            $pdf->SetLineWidth(0.1);
            $pdf->SetFont('helvetica', '', 6);
            for ($x = 0.0; $x <= $pageW; $x += 10.0) {
                $pdf->Line($x, $offsetY, $x, $offsetY + $copyH);
                $pdf->Text($x + 0.5, $offsetY + 0.5, (string) ((int) $x));
            }
            for ($y = 0.0; $y <= $copyH; $y += 10.0) {
                $pdf->Line(0, $offsetY + $y, $pageW, $offsetY + $y);
                $pdf->Text(0.5, $offsetY + $y + 0.5, (string) ((int) $y));
            }
            $pdf->SetTextColor(0, 0, 0);
            $pdf->SetDrawColor(0, 0, 0);
        };

        $venueTickPositions = [
            'HRDC Hall' => [0.105, 0.345],
            'AV Studio' => [0.325, 0.345],
            'Bleacher' => [0.525, 0.345],
            'Alba Hall' => [0.730, 0.345],
            'Student Center Mini-Theater' => [0.105, 0.372],
            'CTE Training Hall' => [0.105, 0.402],
            'Admin Ballroom 2F' => [0.105, 0.432],
            'Multi-Purpose Hall 3F' => [0.495, 0.432],
            'Hum. AV Theater' => [0.105, 0.462],
            'Dance Studio' => [0.495, 0.462],
            'CME Gym' => [0.105, 0.492],
            'Classroom' => [0.600, 0.345],
            'Laboratory Room' => [0.600, 0.372],
            'Library Grounds' => [0.600, 0.402],
            'ORC Quadrangle' => [0.600, 0.432],
            'Others' => [0.600, 0.462],
        ];

        for ($copyIndex = 0; $copyIndex < $copies; $copyIndex++) {
            $offsetY = $copyIndex * $copyH;

            if ($debug) {
                $drawDebugGrid($offsetY);
            }

            $write = function (float $x, float $y, string $text, float $w, string $align = 'L', float $size = 10.0, string $style = '') use ($pdf, $offsetY) {
                $t = trim($text);
                if ($t === '') return;
                $pdf->SetFont('helvetica', $style, $size);
                $pdf->SetXY($x, $offsetY + $y);
                $pdf->MultiCell($w, 0, $t, 0, $align, false, 1);
            };

            $tick = function (float $x, float $y, float $size = 8.0) use ($pdf, $offsetY) {
                $pdf->SetFont('zapfdingbats', '', $size);
                $pdf->Text($x + 0.15, $offsetY + $y + 0.55, '4');
                $pdf->SetFont('helvetica', '', 10);
            };

            $orBoxX = $pageW * 0.72;
            $orBoxW = $pageW * 0.24;
            $orTopY = $copyH * 0.08;
            $lineGap = $copyH * 0.035;

            $write($orBoxX, $orTopY, $orNumber, $orBoxW, 'L', 10);
            $write($orBoxX, $orTopY + $lineGap, $amount, $orBoxW, 'L', 10);
            $write($orBoxX, $orTopY + ($lineGap * 2), $orDate, $orBoxW, 'L', 10);

            $leftX = $pageW * 0.18;
            $leftW = $pageW * 0.44;
            $rightX = $pageW * 0.68;
            $rightW = $pageW * 0.28;
            $mainY = $copyH * 0.215;
            $mainGap = $copyH * 0.043;

            $write($leftX, $mainY, $activity, $leftW, 'L', 10);
            $write($leftX, $mainY + $mainGap, $party, $leftW, 'L', 10);
            $write($rightX, $mainY, $dateOfUse, $rightW, 'L', 10);
            $write($rightX, $mainY + $mainGap, $time, $rightW, 'L', 10);

            foreach ($venueTickPositions as $label => $pos) {
                if ($isSelected($label)) {
                    $tick($pageW * $pos[0], $copyH * $pos[1]);
                }
            }

            $writeAvTable = function (float $baseX, float $yStart, float $rowGap, array $items, array $selected, array $details) use ($pdf, $offsetY) {
                $tickX = $baseX - 0.6;
                $qtyX = $baseX + 21.0;
                $qtyW = 12.0;
                $remarksX = $baseX + 37.0;
                $remarksW = 24.0;

                foreach ($items as $idx => $item) {
                    $rowY = $yStart + ($idx * $rowGap);
                    $selectedHere = in_array($item, $selected, true);
                    if ($selectedHere) {
                        $pdf->SetFont('zapfdingbats', '', 7.5);
                        $pdf->Text($tickX + 0.15, $offsetY + $rowY + 0.55, '4');
                    }

                    if (!$selectedHere) {
                        continue;
                    }

                    $qty = '';
                    $remarks = '';
                    if (isset($details[$item]) && is_array($details[$item])) {
                        if (array_key_exists('qty', $details[$item])) {
                            $qty = is_scalar($details[$item]['qty']) ? trim((string) $details[$item]['qty']) : '';
                        }
                        if (array_key_exists('remarks', $details[$item])) {
                            $remarks = is_scalar($details[$item]['remarks']) ? trim((string) $details[$item]['remarks']) : '';
                        }
                    }

                    if ($qty !== '') {
                        $pdf->SetFont('helvetica', '', 8.5);
                        $pdf->SetXY($qtyX, $offsetY + $rowY - 0.2);
                        $pdf->Cell($qtyW, 4, $qty, 0, 0, 'C', false, '', 0, false, 'T', 'M');
                    }
                    if ($remarks !== '') {
                        $pdf->SetFont('helvetica', '', 8.5);
                        $pdf->SetXY($remarksX, $offsetY + $rowY - 0.2);
                        $pdf->Cell($remarksW, 4, $remarks, 0, 0, 'L', false, '', 0, false, 'T', 'M');
                    }
                }

                $pdf->SetFont('helvetica', '', 10);
            };

            $avYStart = $copyH * 0.585;
            $avRowGap = $copyH * 0.027;
            $writeAvTable($pageW * 0.11, $avYStart, $avRowGap, ['Amplifier', 'Speaker', 'Microphone', 'Others'], $selectedAudio, $audioDetails);
            $writeAvTable($pageW * 0.38, $avYStart, $avRowGap, ['Video Showing', 'Video Editing', 'Video Coverage', 'Others'], $selectedVideo, $videoDetails);
            $writeAvTable($pageW * 0.65, $avYStart, $avRowGap, ['Follow Spot', 'House Light', 'Electric Fans', 'Others'], $selectedLighting, $lightingDetails);

            $sigX = $pageW * 0.20;
            $sigW = $pageW * 0.25;
            $sigY = $copyH * 0.84;
            $write($sigX, $sigY, $requestedBy, $sigW, 'C', 10, 'B');
        }

        return $pdf->Output('ReservationForm.pdf', 'S');
    }
}
