<?php

use Illuminate\Support\Facades\Route;
use Plugin\SubFetcher\Controllers\SubFetcherController;

Route::post('/api/v1/plugin/sub-fetcher/config', [SubFetcherController::class, 'download'])
    ->middleware(['user', 'throttle:10,1']);
