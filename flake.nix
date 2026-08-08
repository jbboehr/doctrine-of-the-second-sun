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
              license = pkgs.lib.licenses.cc-by-sa-40;
            };
          };
        }
      );

      checks = forAllSystems (system: {
        package = self.packages.${system}.default;
      });

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
