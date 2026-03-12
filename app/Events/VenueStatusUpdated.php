<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VenueStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $venueId;
    public string $name;
    public string $status;

    public function __construct(int $venueId, string $name, string $status)
    {
        $this->venueId = $venueId;
        $this->name = $name;
        $this->status = $status;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('venues');
    }

    public function broadcastAs(): string
    {
        return 'VenueStatusUpdated';
    }
}
