@props(['at'])

<time {{ $attributes }} datetime="{{ $at->toIso8601String() }}" title="{{ $at->format('d/m/Y H:i') }}">{{ $at->diffForHumans(options: Carbon\CarbonInterface::JUST_NOW) }}</time>
