Pod::Spec.new do |s|
  s.name           = 'LiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Native bridge for the cardio Live Activity'
  s.description    = 'Starts, updates, and ends the ActivityKit Live Activity shown during an active cardio session.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    # Matches the main app's own deployment target (see ios/Podfile) —
    # every ActivityKit call in LiveActivityModule.swift is already
    # individually guarded with `if #available(iOS 16.1, *)`, so this pod
    # doesn't need (and shouldn't force) a higher floor than the app itself.
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
