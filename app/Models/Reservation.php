<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'date_of_use' => 'date',
        'hrdc_hall' => 'boolean',
        'av_studio' => 'boolean',
        'bleacher' => 'boolean',
        'alba_hall' => 'boolean',
        'student_center_mini_theater' => 'boolean',
        'cte_training_hall_2_or_3' => 'boolean',
        'admin_building_2nd_floor' => 'boolean',
        'hrdc_quad_stage' => 'boolean',
        'dance_studio_hall_3f' => 'boolean',
        'cme_gym' => 'boolean',
        'library_grounds' => 'boolean',
        'hrdc_quadrangle_stage' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
