<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Venue;

class VenuesSeeder extends Seeder
{
    public function run(): void
    {
      $names = [
        'HRDC Hall',
        'AV Studio',
        'Bleacher',
        'Alba Hall',
        'Student Center Mini-Theater',
        'CTE Training Hall 2/3',
        'Admin Ballroom 2F',
        'Multi-Purpose Hall 3F',
        'Hum. AV Theater',
        'Dance Studio',
        'CME Gym',
        'Classroom (Specify)', 
        'Laboratory Room (Specify)',
        'Library Grounds',
        'ORC Quadrangle/Stage',
        'Other (Specify)',
      ];

      foreach ($names as $n) {
        Venue::firstOrCreate(
          ['name' => $n],
          ['is_active' => true, 'status' => 'available']
        );
      }
    }
}

