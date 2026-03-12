<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReservationsSeeder extends Seeder
{
    public function run(): void
    {
        Reservation::query()->delete();

        $category = Category::firstOrCreate(
            ['name' => 'General'],
            ['description' => 'Default category']
        );

        $requester = User::where('role', 'requester')->first();
        if (!$requester) {
            $requester = User::create([
                'name' => 'Requester',
                'email' => 'requester@example.com',
                'password' => bcrypt('password'),
                'role' => 'requester',
                'department' => 'General',
            ]);
        }

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
