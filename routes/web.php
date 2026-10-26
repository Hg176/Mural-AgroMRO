<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DocumentController;
use App\Livewire\Feed;
use App\Livewire\FolderBrowser;
use App\Livewire\Home;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/entrar', [LoginController::class, 'create'])->name('login');
    Route::post('/entrar', [LoginController::class, 'store'])->middleware('throttle:10,1');
});

Route::middleware('auth')->group(function () {
    Route::post('/sair', [LoginController::class, 'destroy'])->name('logout');

    Route::get('/', Home::class)->name('home');
    Route::get('/novidades', Feed::class)->name('feed');

    Route::get('/arquivos', FolderBrowser::class)->name('folders.index');
    Route::get('/arquivos/{folder}', FolderBrowser::class)->name('folders.show');

    Route::get('/documentos/{document}/baixar', [DocumentController::class, 'download'])->name('documents.download');
    Route::get('/documentos/{document}/ver', [DocumentController::class, 'preview'])->name('documents.preview');
});
