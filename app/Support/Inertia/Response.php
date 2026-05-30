<?php

namespace App\Support\Inertia;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Response as ResponseFactory;

class Response extends \Inertia\Response
{
    public function toResponse($request)
    {
        $only = array_filter(explode(',', $request->header('X-Inertia-Partial-Data', '')));

        $props = ($only && $request->header('X-Inertia-Partial-Component') === $this->component)
            ? Arr::only($this->props, $only)
            : array_filter($this->props, static function ($prop) {
                return !($prop instanceof \Inertia\LazyProp);
            });

        $page = [
            'component' => $this->component,
            'props' => $this->resolvePropertyInstances($props, $request),
            'url' => $this->resolvePageUrl($request),
            'version' => $this->version,
        ];

        if ($request->header('X-Inertia')) {
            return new JsonResponse($page, 200, ['X-Inertia' => 'true']);
        }

        return ResponseFactory::view($this->rootView, $this->viewData + ['page' => $page]);
    }

    private function resolvePageUrl($request): string
    {
        $baseUrl = rtrim($request->getBaseUrl(), '/');
        $requestUri = $request->getRequestUri();

        if ($baseUrl !== '' && $this->requestUriStartsWithBaseUrl($requestUri, $baseUrl)) {
            $requestUri = substr($requestUri, strlen($baseUrl));
            if ($requestUri === '' || str_starts_with($requestUri, '?')) {
                $requestUri = '/'.$requestUri;
            }
        }

        return $baseUrl.$requestUri;
    }

    private function requestUriStartsWithBaseUrl(string $requestUri, string $baseUrl): bool
    {
        return $requestUri === $baseUrl
            || str_starts_with($requestUri, $baseUrl.'/')
            || str_starts_with($requestUri, $baseUrl.'?');
    }
}
