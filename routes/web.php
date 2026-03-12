<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Serve the React SPA for client-side routes (excluding /api/*)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');
