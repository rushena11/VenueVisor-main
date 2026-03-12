<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    public function index()
    {
        return Venue::where('is_active', true)
            ->orderByRaw('display_order IS NULL')
            ->orderBy('display_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'status' => 'nullable|in:available,maintenance,repair,unavailable'
        ]);
        return Venue::create($request->all());
    }

    public function show($id)
    {
        return Venue::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'nullable|in:available,maintenance,repair,unavailable'
        ]);
        $venue = Venue::findOrFail($id);
        $originalStatus = $venue->status;
        $venue->update($request->all());
        if ($request->has('status') && $venue->status !== $originalStatus) {
            event(new \App\Events\VenueStatusUpdated($venue->id, $venue->name, $venue->status));
            \Illuminate\Support\Facades\Cache::increment('venues_status_version');
        }
        return $venue;
    }

    public function destroy($id)
    {
        $venue = Venue::findOrFail($id);
        $venue->is_active = false; // Soft deleteish
        $venue->save();
        return response()->json(['message' => 'Venue deactivated']);
    }
}
