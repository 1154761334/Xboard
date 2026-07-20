<?php

namespace Plugin\SubFetcher\Controllers;

use App\Http\Controllers\V1\Client\ClientController;
use App\Services\Plugin\InterceptResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class SubFetcherController
{
    private const CLIENTS = [
        'clash' => [
            'user_agent' => 'Clash/1.18.0',
            'filename' => 'subscription-clash.yaml',
            'content_type' => 'application/yaml; charset=utf-8',
        ],
        'v2ray' => [
            'user_agent' => 'v2rayN/6.0',
            'filename' => 'subscription-v2ray.txt',
            'content_type' => 'text/plain; charset=utf-8',
        ],
        'singbox' => [
            'user_agent' => 'sing-box/1.11.0',
            'filename' => 'subscription-singbox.json',
            'content_type' => 'application/json; charset=utf-8',
        ],
        'surge' => [
            'user_agent' => 'Surge/5.0',
            'filename' => 'subscription-surge.conf',
            'content_type' => 'text/plain; charset=utf-8',
        ],
    ];

    public function download(Request $request): HttpResponse
    {
        $this->rejectNonJsonInputs($request);

        $body = $request->json()->all();
        $this->rejectUnexpectedFields($body);

        $validated = Validator::make($request->json()->all(), [
            'client' => ['required', 'string', Rule::in(array_keys(self::CLIENTS))],
        ])->validate();
        $client = $validated['client'];

        try {
            $subscription = $this->subscribeFor($request->user(), self::CLIENTS[$client]['user_agent']);

            return $this->downloadResponse($subscription, self::CLIENTS[$client]);
        } catch (InterceptResponseException $exception) {
            return $exception->getResponse();
        } catch (Throwable) {
            return Response::make('Internal Server Error', 500, [
                'Cache-Control' => 'no-store',
                'Content-Type' => 'text/plain; charset=utf-8',
            ]);
        }
    }

    private function rejectNonJsonInputs(Request $request): void
    {
        if (! $request->isJson() || $request->query->all() !== [] || $request->request->all() !== []) {
            throw ValidationException::withMessages([
                'client' => 'A JSON request body containing only the client field is required.',
            ]);
        }
    }

    private function rejectUnexpectedFields(array $body): void
    {
        $unexpected = array_diff(array_keys($body), ['client']);

        if ($unexpected !== []) {
            throw ValidationException::withMessages([
                'client' => 'Only the client field is accepted.',
            ]);
        }
    }

    private function subscribeFor($user, string $userAgent): HttpResponse
    {
        $request = Request::create('/api/v1/client/subscribe', 'GET', [], [], [], [
            'HTTP_USER_AGENT' => $userAgent,
        ]);
        $request->setUserResolver(static fn () => $user);

        return app(ClientController::class)->subscribe($request);
    }

    private function downloadResponse(HttpResponse $subscription, array $client): HttpResponse
    {
        $headers = [
            'Cache-Control' => 'no-store',
            'Content-Type' => $client['content_type'],
            'Content-Disposition' => 'attachment; filename="' . $client['filename'] . '"',
        ];

        foreach (['subscription-userinfo', 'profile-update-interval'] as $header) {
            $value = $subscription->headers->get($header);

            if ($value !== null) {
                $headers[$header] = $value;
            }
        }

        return Response::make($subscription->getContent(), $subscription->getStatusCode(), $headers);
    }
}
