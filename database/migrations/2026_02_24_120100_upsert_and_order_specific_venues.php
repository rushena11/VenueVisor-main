<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure required venues exist
        $names = ['HRDC Hall', 'AV Studio', 'Bleacher', 'Alba Hall', 'Dance Studio', 'CME Gym'];
        foreach ($names as $n) {
            $exists = DB::table('venues')->where('name', $n)->exists();
            if (!$exists) {
                DB::table('venues')->insert([
                    'name' => $n,
                    'is_active' => true,
                    'status' => 'available',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Assign display orders focused on requested positions
        // HRDC Hall -> 100, AV Studio -> 110
        // Bleacher -> 120, Alba Hall -> 130
        // Dance Studio -> 200, CME Gym -> 210
        $orders = [
            'HRDC Hall' => 100,
            'AV Studio' => 110,
            'Bleacher' => 120,
            'Alba Hall' => 130,
            'Dance Studio' => 200,
            'CME Gym' => 210,
        ];

        foreach ($orders as $n => $o) {
            DB::table('venues')->where('name', $n)->update([
                'display_order' => $o,
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Revert only the display_order changes; do not delete rows
        DB::table('venues')
            ->whereIn('name', ['HRDC Hall', 'AV Studio', 'Bleacher', 'Alba Hall', 'Dance Studio', 'CME Gym'])
            ->update(['display_order' => null, 'updated_at' => now()]);
    }
};

