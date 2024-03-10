let pkgs = import <nixpkgs> {};

in pkgs.mkShell rec {
    name = "webdev";

    buildInputs = with pkgs; [
        pkgs.nodejs_18
    ];

    shellHook = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
    '';
}