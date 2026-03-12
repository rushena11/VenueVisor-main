<?php
$file = 'd:\laragon\www\VenueVisor\public\build\assets\Reservation Form\revised venue reservation form 2026.html';
$content = file_get_contents($file);
$start = strpos($content, '<body');
if ($start === false) {
    echo "BODY_NOT_FOUND";
} else {
    echo substr($content, $start, 5000); // Read 5000 chars to get a good chunk
}
