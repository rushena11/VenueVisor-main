<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('reservations')) {
            return;
        }
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->string('activity_event');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // requesting_party linked to user
            $table->string('requesting_party'); // Text field for display name or department
            $table->date('date_of_use');
            $table->time('inclusive_time_start');
            $table->time('inclusive_time_end');
            if (Schema::hasTable('categories')) {
                $table->foreignId('category_id')->constrained();
            } else {
                $table->unsignedBigInteger('category_id');
            }
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');

            // Venue Requested (Booleans as requested)
            $table->boolean('hrdc_hall')->default(false);
            $table->boolean('av_studio')->default(false);
            $table->boolean('bleacher')->default(false);
            $table->boolean('alba_hall')->default(false);
            $table->boolean('student_center_mini_theater')->default(false);
            $table->boolean('cte_training_hall_2_or_3')->default(false);
            $table->boolean('admin_building_2nd_floor')->default(false);
            $table->boolean('hrdc_quad_stage')->default(false);
            $table->boolean('dance_studio_hall_3f')->default(false);
            $table->boolean('cme_gym')->default(false);
            $table->string('classroom_specify')->nullable();
            $table->string('laboratory_room_specify')->nullable();
            $table->boolean('library_grounds')->default(false);
            $table->boolean('hrdc_quadrangle_stage')->default(false);
            $table->string('others_venue_specify')->nullable();

            // Audio System
            $table->integer('amplifier_qty')->default(0);
            $table->integer('speaker_qty')->default(0);
            $table->integer('microphone_qty')->default(0);
            $table->integer('audio_others_qty')->default(0);
            $table->text('audio_remarks')->nullable();

            // Video System
            $table->integer('video_showing_qty')->default(0);
            $table->integer('video_editing_qty')->default(0);
            $table->integer('video_coverage_qty')->default(0);
            $table->integer('video_others_qty')->default(0);
            $table->text('video_remarks')->nullable();

            // Lighting System / Fans
            $table->integer('follow_spot_qty')->default(0);
            $table->integer('house_light_qty')->default(0);
            $table->integer('electric_fans_qty')->default(0);
            $table->integer('lighting_others_qty')->default(0);
            $table->text('lighting_remarks')->nullable();

            // Approval & Signatories
            $table->string('requested_by')->nullable(); // Name
            $table->string('requesting_party_signature')->nullable(); // Path to signature image
            $table->string('hrdc_av_coordinator')->nullable();
            $table->string('recommending_approval')->nullable();
            $table->string('approved_by')->nullable();
            $table->date('date_received')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
