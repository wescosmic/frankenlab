Add-Type -AssemblyName System.Speech
$text = Get-Content -Raw -LiteralPath 'docs/demo/submission-voiceover.txt'
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft David Desktop')
$synth.Rate = -1
$synth.Volume = 100
$synth.SetOutputToWaveFile('docs/demo/submission-voiceover.wav')
$synth.Speak($text)
$synth.Dispose()
