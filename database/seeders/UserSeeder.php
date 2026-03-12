<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@lnu.edu.ph'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'department' => 'PPFF',
            ]
        );

        User::firstOrCreate(
            ['email' => 'faculty@lnu.edu.ph'],
            [
                'name' => 'Faculty Member',
                'password' => Hash::make('password'),
                'role' => 'requester',
                'department' => 'College of Education',
            ]
        );
    }
}
