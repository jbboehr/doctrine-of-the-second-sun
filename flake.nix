{
  description = "Doctrine of the Second Sun documentation";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "doctrine-of-the-second-sun";
            version = self.shortRev or (self.dirtyShortRev or "dev");
            src = self;
            dontBuild = true;

            installPhase = ''
              runHook preInstall

              destination="$out/share/doctrine-of-the-second-sun"
              mkdir -p "$destination"
              cp ./*.md "$destination/"
              cp -R ./assets "$destination/"
              cp -R ./integrations "$destination/"

              runHook postInstall
            '';

            meta = {
              description = "Portable doctrine, visual, coding, and software-stewardship guides";
              homepage = "https://github.com/jbboehr/doctrine-of-the-second-sun";
              # Nixpkgs has no composite license for the Romic additional permission.
              license = [
                pkgs.lib.licenses.cc-by-sa-40
                pkgs.lib.licenses.agpl3Only
              ];
            };
          };
        }
      );

      checks = forAllSystems (system: {
        package = self.packages.${system}.default;
      });

      apps.x86_64-linux =
        let
          pkgs = import nixpkgs { system = "x86_64-linux"; };
          playwrightBrowsers = pkgs.playwright-driver.selectBrowsers {
            withChromium = false;
            withChromiumHeadlessShell = false;
            withFirefox = true;
            withWebkit = false;
            withFfmpeg = false;
          };
          testHeliogenesis = pkgs.writeShellApplication {
            name = "test-heliogenesis";
            runtimeInputs = [
              pkgs.chromium
              pkgs.miniserve
              pkgs.playwright-test
            ];
            text = ''
              export HELIOGENESIS_CHROMIUM_PATH="${pkgs.lib.getExe pkgs.chromium}"
              export HELIOGENESIS_INTEGRATION_ROOT="${self}/integrations/web/heliogenesis"
              export PLAYWRIGHT_BROWSERS_PATH="${playwrightBrowsers}"
              export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

              exec playwright test \
                --config="${self}/integrations/web/heliogenesis/tests/playwright.config.cjs" \
                "$@"
            '';
          };
        in
        {
          test-heliogenesis = {
            type = "app";
            program = "${testHeliogenesis}/bin/test-heliogenesis";
            meta.description = "Run the Heliogenesis browser integration tests";
          };
        };

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
