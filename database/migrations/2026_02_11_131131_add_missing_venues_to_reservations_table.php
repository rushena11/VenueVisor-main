<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->boolean('multi_purpose_hall_3f')->default(false)->after('admin_building_2nd_floor');
            $table->boolean('hum_av_theater')->default(false)->after('dance_studio_hall_3f');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['multi_purpose_hall_3f', 'hum_av_theater']);
        });
    }
};
