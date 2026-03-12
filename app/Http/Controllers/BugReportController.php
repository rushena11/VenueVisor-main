<?php

namespace App\Http\Controllers;

use App\Models\BugReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class BugReportController extends Controller
{
    private function ensureAdmin()
    {
        $user = Auth::user();
        if (!$user || !in_array($user->role ?? '', ['admin', 'staff'])) {
            abort(403, 'Forbidden');
        }
    }

    public function index(Request $request)
    {
        $this->ensureAdmin();
        $q = BugReport::query()
            ->orderByDesc('created_at');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage < 1) $perPage = 10;
        if ($perPage > 10) $perPage = 10;
        return response()->json($q->paginate($perPage));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'url' => ['nullable', 'string', 'max:2048'],
        ]);

        $data['user_id'] = Auth::id();
        $data['status'] = 'new';

        $bug = BugReport::create($data);

        try {
            $to = config('mail.support_address') ?: env('SUPPORT_EMAIL', 'it@lnu.edu.ph');
            if ($to) {
                $subject = '[VenueVisor] Bug Report: ' . ($bug->title ?: 'Untitled');
                $body = "A new bug report was submitted.\n\n"
                      . "Title: " . ($bug->title ?: 'N/A') . "\n"
                      . "Description:\n" . $bug->description . "\n\n"
                      . "From: " . ($bug->name ?: 'N/A') . " <" . ($bug->email ?: 'N/A') . ">\n"
                      . "URL: " . ($bug->url ?: 'N/A') . "\n"
                      . "When: " . $bug->created_at . "\n";
                Mail::raw($body, function ($m) use ($to, $subject) {
                    $m->to($to)->subject($subject);
                });
            }
        } catch (\Throwable $e) {
            // Fail silently; UI already falls back to mailto if POST fails
        }

        return response()->json($bug, 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $this->ensureAdmin();
        $data = $request->validate([
            'status' => ['required', 'string', 'in:new,triaged,in_progress,resolved,closed'],
        ]);
        $bug = BugReport::findOrFail($id);
        $bug->status = $data['status'];
        $bug->save();
        return response()->json($bug);
    }
}
