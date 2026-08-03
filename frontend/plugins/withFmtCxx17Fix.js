const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// The "fmt" pod (a transitive dependency pulled in by React Native/Hermes)
// fails to compile under newer Xcode/Clang versions: its FMT_STRING macro
// relies on consteval evaluation that recent Clang enforces more strictly
// than this pinned fmt version supports ("call to consteval function ...
// is not a constant expression" in format-inl.h). Forcing it to compile as
// C++17 avoids that stricter C++20 consteval path entirely.
//
// This has to be injected as a Podfile post_install hook, since the fix
// targets a CocoaPods-generated target (Pods.xcodeproj) that doesn't exist
// until `pod install` runs — a plain Xcode-project mod can't reach it.
// Without this plugin, `expo prebuild` would regenerate a fresh ios/Podfile
// and silently drop the fix on every clean rebuild.
//
// Must be inserted AFTER the react_native_post_install(...) call, not
// before: that helper sets CLANG_CXX_LANGUAGE_STANDARD to c++20 on pod
// targets (including fmt) as part of its own setup, so a fix placed earlier
// in the post_install block gets silently overwritten.

const MARKER = "# withFmtCxx17Fix";

const FIX_BLOCK = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

const withFmtCxx17Fix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfilePath, "utf-8");

      if (contents.includes(MARKER)) {
        return config;
      }

      const anchor = /react_native_post_install\([\s\S]*?\n\s*\)\n/;
      const match = contents.match(anchor);
      if (!match) {
        throw new Error(
          "withFmtCxx17Fix: could not find a 'react_native_post_install(...)' call in the generated Podfile to anchor the fmt fix.",
        );
      }

      const insertAt = match.index + match[0].length;
      contents =
        contents.slice(0, insertAt) + FIX_BLOCK + contents.slice(insertAt);
      fs.writeFileSync(podfilePath, contents);

      return config;
    },
  ]);
};

module.exports = withFmtCxx17Fix;
