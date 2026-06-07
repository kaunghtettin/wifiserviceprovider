<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        URL::forceRootUrl(rtrim((string) config('app.url'), '/'));

        $this->app->singleton(
            \Inertia\ResponseFactory::class,
            \App\Support\Inertia\ResponseFactory::class
        );

        \Inertia\Inertia::clearResolvedInstance(\Inertia\ResponseFactory::class);
    }
}
