<?php

namespace App\Support\Inertia;

use Illuminate\Contracts\Support\Arrayable;

class ResponseFactory extends \Inertia\ResponseFactory
{
    public function render(string $component, $props = []): \Inertia\Response
    {
        if ($props instanceof Arrayable) {
            $props = $props->toArray();
        }

        return new Response(
            $component,
            array_merge($this->sharedProps, $props),
            $this->rootView,
            $this->getVersion()
        );
    }
}
