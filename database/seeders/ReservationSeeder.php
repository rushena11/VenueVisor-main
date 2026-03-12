<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use App\Models\Reservation;
use Illuminate\Support\Facades\Hash;

class ReservationSeeder extends Seeder
{
    public function run(): void
    {
        $category = Category::firstOrCreate(
            ['name' => 'General'],
            ['description' => 'Default category']
        );

        $requester = User::firstOrCreate(
            ['email' => 'faculty@lnu.edu.ph'],
            [
                'name' => 'Faculty Member',
                'password' => Hash::make('password'),
                'role' => 'requester',
                'department' => 'College of Education',
            ]
        );

        Reservation::create([
            'activity_event' => 'Ongoing Real-time Event',
            'user_id' => $requester->id,
            'requesting_party' => 'College of Education',
            'date_of_use' => now()->toDateString(),
            'inclusive_time_start' => now()->subHour()->format('H:i'),
            'inclusive_time_end' => now()->addHours(2)->format('H:i'),
            'category_id' => $category->id,
            'status' => 'approved',
            'hrdc_hall' => true,
            'approved_by' => 'Admin User'
        ]);

        Reservation::create([
            'activity_event' => 'Upcoming Event Today',
            'user_id' => $requester->id,
            'requesting_party' => 'Student Council',
            'date_of_use' => now()->toDateString(),
            'inclusive_time_start' => now()->addHours(3)->format('H:i'),
            'inclusive_time_end' => now()->addHours(5)->format('H:i'),
            'category_id' => $category->id,
            'status' => 'approved',
            'alba_hall' => true,
            'approved_by' => 'Admin User'
        ]);
    }
}
