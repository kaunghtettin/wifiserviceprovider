<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

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
        $this->app->singleton(
            \Inertia\ResponseFactory::class,
            \App\Support\Inertia\ResponseFactory::class
        );

        \Inertia\Inertia::clearResolvedInstance(\Inertia\ResponseFactory::class);
    }
}
