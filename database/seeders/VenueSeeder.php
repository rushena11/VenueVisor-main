<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Venue;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $venues = [
            'HRDC Hall', 'AV Studio', 'Bleacher', 'Student Center Mini-Theater', 'CTE Training Hall',
            'Admin Ballroom 2F', 'Multi-Purpose Hall 3F', 'Hum. AV Theater', 'Dance Studio',
            'Classroom', 'Laboratory Room', 'Library Grounds', 'ORC Quadrangle/Stage'
        ];
        foreach ($venues as $venue) {
            Venue::firstOrCreate(['name' => $venue], ['is_active' => true]);
        }
    }
}
