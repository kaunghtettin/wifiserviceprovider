<?php

namespace Tests\Feature;

use App\Http\Middleware\Authenticate;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Tests\TestCase;

class AdminAuthenticationRedirectTest extends TestCase
{
    public function test_admin_login_redirect_does_not_duplicate_the_application_base_path(): void
    {
        URL::forceRootUrl('http://localhost/isp/public');

        try {
            $request = Request::create(
                'http://localhost/isp/public/dashboard',
                'GET',
                [],
                [],
                [],
                [
                    'SCRIPT_NAME' => '/isp/public/index.php',
                    'SCRIPT_FILENAME' => 'C:/xampp/htdocs/isp/public/index.php',
                    'PHP_SELF' => '/isp/public/index.php/dashboard',
                ]
            );

            $middleware = new class($this->app['auth']) extends Authenticate {
                public function redirectLocation(Request $request): ?string
                {
                    return $this->redirectTo($request);
                }
            };

            $this->assertSame('/isp/public', $request->getBaseUrl());
            $this->assertSame(
                'http://localhost/isp/public/login',
                $middleware->redirectLocation($request)
            );
        } finally {
            URL::forceRootUrl(null);
        }
    }

    public function test_inertia_page_url_does_not_duplicate_the_application_base_path(): void
    {
        URL::forceRootUrl('http://localhost/isp/public');

        try {
            $request = Request::create(
                'http://localhost/isp/public/login',
                'GET',
                [],
                [],
                [],
                [
                    'HTTP_X_INERTIA' => 'true',
                    'SCRIPT_NAME' => '/isp/public/index.php',
                    'SCRIPT_FILENAME' => 'C:/xampp/htdocs/isp/public/index.php',
                    'PHP_SELF' => '/isp/public/index.php/login',
                ]
            );

            $shared = $this->app->make(HandleInertiaRequests::class)->share($request);
            $page = Inertia::render('Auth/Login')->toResponse($request)->getData(true);

            $this->assertSame('/isp/public/login', $page['url']);
            $this->assertSame('http://localhost/isp/public', $shared['admin_app_url']);
            $this->assertSame('/isp/public', $shared['app_base']);
        } finally {
            URL::forceRootUrl(null);
        }
    }
}
