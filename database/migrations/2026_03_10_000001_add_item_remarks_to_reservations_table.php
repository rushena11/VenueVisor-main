<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Audio item-level remarks
            $table->text('amplifier_remarks')->nullable();
            $table->text('speaker_remarks')->nullable();
            $table->text('microphone_remarks')->nullable();
            // Audio "Others" remarks (qty column already exists)
            $table->text('audio_others_remarks')->nullable();

            // Video item-level remarks
            $table->text('video_showing_remarks')->nullable();
            $table->text('video_editing_remarks')->nullable();
            $table->text('video_coverage_remarks')->nullable();
            // Video "Others" remarks (qty column already exists)
            $table->text('video_others_remarks')->nullable();

            // Lighting/Fans item-level remarks
            $table->text('follow_spot_remarks')->nullable();
            $table->text('house_light_remarks')->nullable();
            $table->text('electric_fans_remarks')->nullable();
            // Lighting "Others" remarks (qty column already exists)
            $table->text('lighting_others_remarks')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn([
                'amplifier_remarks',
                'speaker_remarks',
                'microphone_remarks',
                'audio_others_remarks',
                'video_showing_remarks',
                'video_editing_remarks',
                'video_coverage_remarks',
                'video_others_remarks',
                'follow_spot_remarks',
                'house_light_remarks',
                'electric_fans_remarks',
                'lighting_others_remarks',
            ]);
        });
    }
};
