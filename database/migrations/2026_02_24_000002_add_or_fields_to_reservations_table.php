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
        if (!Schema::hasColumn('reservations', 'or_number')) {
            Schema::table('reservations', function (Blueprint $table) {
                $table->string('or_number')->nullable()->after('approved_by');
            });
        }
        if (!Schema::hasColumn('reservations', 'or_amount')) {
            Schema::table('reservations', function (Blueprint $table) {
                $table->string('or_amount')->nullable()->after('or_number');
            });
        }
        if (!Schema::hasColumn('reservations', 'or_date')) {
            Schema::table('reservations', function (Blueprint $table) {
                $table->date('or_date')->nullable()->after('or_amount');
            });
        }
        if (!Schema::hasColumn('reservations', 'requested_by')) {
            Schema::table('reservations', function (Blueprint $table) {
                $table->string('requested_by')->nullable()->after('requesting_party');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['or_number', 'or_amount', 'or_date', 'requested_by']);
        });
    }
};
