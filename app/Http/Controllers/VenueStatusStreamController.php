<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VenueStatusStreamController extends Controller
{
    public function stream(Request $request)
    {
        @ini_set('output_buffering', 'off');
        @ini_set('zlib.output_compression', 0);
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');

        $lastVersion = (int) Cache::get('venues_status_version', 0);
        $send = function ($payload) {
            echo "event: venues\n";
            echo 'data: ' . json_encode($payload) . "\n\n";
            @ob_flush();
            @flush();
        };

        // Send initial snapshot
        $initial = Venue::where('is_active', true)->get(['id','name','status']);
        $send(['version' => $lastVersion, 'venues' => $initial]);

        $maxSeconds = (int) env('VENUE_SSE_HOLD_SECONDS', php_sapi_name() === 'cli-server' ? 0 : 120);
        if ($maxSeconds <= 0) {
            echo ": keep-alive end\n\n";
            return;
        }

        // Hold the connection briefly to push updates (short window to avoid blocking dev server)
        $start = time();
        while (!connection_aborted() && (time() - $start) < $maxSeconds) {
            clearstatcache();
            $v = (int) Cache::get('venues_status_version', 0);
            if ($v !== $lastVersion) {
                $lastVersion = $v;
                $list = Venue::where('is_active', true)->get(['id','name','status']);
                $send(['version' => $lastVersion, 'venues' => $list]);
            }
            sleep(1);
        }
        // Final comment to terminate gracefully
        echo ": keep-alive end\n\n";
    }
}
