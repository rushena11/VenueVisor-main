<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\VenueController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\VenueStatusStreamController;
use App\Http\Controllers\BugReportController;


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public Routes
Route::get('/venues', [VenueController::class, 'index']);
Route::get('/venues/stream', [VenueStatusStreamController::class, 'stream']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/public/reservations', [ReservationController::class, 'publicIndex']);

// Bug reports (public can submit)
Route::post('/bug-report', [BugReportController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::apiResource('categories', CategoryController::class)->except(['index']);
    Route::apiResource('venues', VenueController::class)->except(['index']);
    

    Route::get('reservations', [ReservationController::class, 'index']);
    Route::post('reservations', [ReservationController::class, 'store']);
    Route::get('reservations/{id}', [ReservationController::class, 'show']);
    Route::put('reservations/{id}', [ReservationController::class, 'update']);
    Route::delete('reservations/{id}', [ReservationController::class, 'destroy']);
    
    // Admin/Staff only
    Route::put('reservations/{id}/status', [ReservationController::class, 'updateStatus']);

    // Generate Reservation Form PDF using TCPDF
    Route::post('reservations/form-pdf', [ReservationController::class, 'formPdf']);

    // Bug reports admin endpoints
    Route::get('bug-reports', [BugReportController::class, 'index']);
    Route::put('bug-reports/{id}/status', [BugReportController::class, 'updateStatus']);
});
