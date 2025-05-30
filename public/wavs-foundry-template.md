This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.github/
  workflows/
    contracts.yml
    e2e.yml
    rust.yml
    wavs-image-version-verifier.yml
  single-wavs-image-verifier.bash
components/
  eth-price-oracle/
    src/
      bindings.rs
      lib.rs
      trigger.rs
    Cargo.toml
docs/
  tutorial/
    1-overview.mdx
    2-setup.mdx
    3-project.mdx
    4-component.mdx
    5-build.mdx
    6-run-service.mdx
    7-prediction.mdx
  benefits.mdx
  custom-components.mdx
  design.mdx
  how-it-works.mdx
  index.mdx
  overview.mdx
script/
  .solhint.json
  Common.s.sol
  Deploy.s.sol
  ShowResult.s.sol
  Trigger.s.sol
src/
  contracts/
    WavsSubmit.sol
    WavsTrigger.sol
  interfaces/
    .solhint.json
    ITypes.sol
    IWavsSubmit.sol
    IWavsTrigger.sol
test/
  unit/
    WavsTrigger.t.sol
  .solhint.json
tools/
  upgrade.sh
.env.example
.gitignore
.solhint.json
aggregator.toml
Cargo-component.lock
Cargo.toml
CHANGELOG.md
cli.toml
docker-compose.yml
foundry.toml
LICENSE
Makefile
natspec-smells.config.js
package.json
README.md
remappings.txt
rustfmt.toml
wavs.toml
```

# Files

## File: .github/workflows/contracts.yml
````yaml
name: Solidity
on:
  pull_request:

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
        with:
          version: stable

      - uses: actions/setup-node@v4
        name: Install Node.js
        with:
          node-version: 21

      - name: Install deps
        run: make setup

      - name: Run forge build
        run: forge build -vvv

      - name: Run forge tests
        run: forge test -vvv
````

## File: .github/workflows/e2e.yml
````yaml
name: E2E

# based on https://docs.wavs.xyz/ & this repos README.md

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

# Ensures that only a single workflow per PR will run at a time. Cancels in-progress jobs if new commit is pushed.
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  run:
    runs-on: ubuntu-latest
    env:
      DEBUGGING: true

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Install Ubuntu packages
      run: sudo apt-get install bash make jq

    - uses: actions/setup-node@v4
      name: Install Node.js
      with:
        node-version: 21

    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        profile: minimal
        toolchain: stable
        override: true

    - name: Cache Rust target
      uses: actions/cache@v3
      with:
        path: |
          ~/.rustup/toolchains
          ~/.cargo/bin/
          ~/.cargo/registry/index/
          ~/.cargo/registry/cache/
          ~/.cargo/git/db/
          target/
        key: ${{ runner.os }}-rust-wasm32-${{ hashFiles('**/Cargo.lock') }}
        restore-keys: |
          ${{ runner.os }}-rust-wasm32-

    - uses: cargo-bins/cargo-binstall@main
      name: Install cargo-binstall
      with:
        version: latest

    - name: Install Foundry
      uses: foundry-rs/foundry-toolchain@v1
      with:
        version: stable

    - name: Install rust wasm32-wasip2
      run: rustup target add wasm32-wasip2

    - name: Install wasi components
      run: |
        cargo binstall cargo-component warg-cli wkg --locked --no-confirm --force
        wkg config --default-registry wa.dev

    - name: Install forge deps
      run: make setup

    - name: build contracts
      run: forge build

    # `strings | grep BTC` verifies the output contains BTC from the price oracle example
    - name: wasi build and local exec
      run: |
        make wasi-build
        make wasi-exec | strings | grep BTC

    # modified version of `make start-all`
    - name: Build the stack
      run: |
        cp .env.example .env
        anvil --host 0.0.0.0 &
        docker compose up -d

    - name: Run tests
      run: |
        export SERVICE_MANAGER_ADDR=`make get-eigen-service-manager-from-deploy`
        forge script ./script/Deploy.s.sol ${SERVICE_MANAGER_ADDR} --sig "run(string)" --rpc-url http://localhost:8545 --broadcast
        sleep 2
        TRIGGER_EVENT="NewTrigger(bytes)" make deploy-service
        sleep 2
        export COIN_MARKET_CAP_ID=1
        export SERVICE_TRIGGER_ADDR=`make get-trigger-from-deploy`
        forge script ./script/Trigger.s.sol ${SERVICE_TRIGGER_ADDR} ${COIN_MARKET_CAP_ID} --sig "run(string,string)" --rpc-url http://localhost:8545 --broadcast -v 4
        sleep 2

    # `strings | grep BTC` verifies the output contains BTC from the price oracle example
    - name: Run show result
      run: |
        make show-result | strings | grep BTC

    - name: Stop the stack
      run: |
        killall anvil
        docker compose down
````

## File: .github/workflows/rust.yml
````yaml
name: Rust

on:
  pull_request:

jobs:
  tests-stable:
    name: Tests (Stable)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout sources
        uses: actions/checkout@v4

      - name: Install toolchain
        uses: dtolnay/rust-toolchain@stable

      - uses: Swatinem/rust-cache@v2
        with:
          cache-on-failure: true

      - name: cargo test
        run: cargo test --workspace --all-features

  docs:
    name: docs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rust-docs

      - uses: Swatinem/rust-cache@v2

      - name: doc
        run: cargo doc --workspace --all-features --no-deps --document-private-items
        env:
          RUSTDOCFLAGS: "-D warnings"

  fmt:
    name: fmt
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - name: fmt --check
        run: cargo fmt --all --check

#   clippy:
#     name: clippy
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - uses: dtolnay/rust-toolchain@stable
#         with:
#           components: clippy
#       - uses: Swatinem/rust-cache@v2
#       - name: clippy
#         run: cargo clippy --workspace --tests --all-features
#         env:
#           RUSTFLAGS: "-D warnings"
````

## File: .github/workflows/wavs-image-version-verifier.yml
````yaml
name: Check WAVS Image Version

on:
  pull_request:
  workflow_dispatch:

# Ensures that only a single workflow per PR will run at a time. Cancels in-progress jobs if new commit is pushed.
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  script:
    runs-on: ubuntu-latest
    env:
      DEBUGGING: true

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Install bash
      run: sudo apt-get install bash

    - name: Make script executable
      run: chmod +x .github/single-wavs-image-verifier.bash

    - name: Run script
      run: bash .github/single-wavs-image-verifier.bash
````

## File: .github/single-wavs-image-verifier.bash
````bash
#!/bin/bash

# Define the pattern
# Updated to handle semantic versions with suffixes (like -beta, -alpha, etc.)
GREP_PATTERN='ghcr\.io/lay3rlabs/wavs:(v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?|[a-zA-Z0-9-_./]+)'

export DEBUGGING=${DEBUGGING:-false}

main() {
    # declare an empty array
    matches_set=()

    # iterate over all files not ignored by .gitignore
    while read file; do
        if [[ $file == lib/* ]]; then
            continue
        fi
        if [[ $file == *$(basename $0) ]]; then
            continue
        fi

        found_docker=$(grep -P -o "$GREP_PATTERN" $file)
        if [[ ! -z $found_docker ]]; then
            # ensure found_docker is split on new lines to each their own array components (some files may have multiple references)
            IFS=$'\n' read -rd '' -a found_docker_array <<< "$found_docker"
            for i in "${found_docker_array[@]}"; do
                if [[ $DEBUGGING == "true" ]]; then
                    echo "Found in $file: $i"
                fi

                # check if the array already contains the item, if it does, skip adding it
                if [[ " ${matches_set[@]} " =~ " ${i} " ]]; then
                    continue
                fi

                matches_set+=("$i")
            done
        fi
    done < <(git ls-files --cached --others --exclude-standard)

    if [[ ${#matches_set[@]} -eq 1 ]]; then
        echo "Only found a single image: ${matches_set[0]}, success"
        exit 0
    else
        echo "Found multiple docker images in the codebase:"
        for i in "${matches_set[@]}"; do
            echo "$i"
        done
        echo "Please ensure only a single wavs docker image is being referenced in the files"
        exit 1
    fi
}

test_data() {
    # Example test data
    TEST_DATA="
    Running container ghcr.io/lay3rlabs/wavs:0.3.0-beta
    Pulling ghcr.io/lay3rlabs/wavs:latest
    Found ghcr.io/lay3rlabs/wavs:0.1.0
    Invalid: docker.io/other/image:1.0
    Using ghcr.io/lay3rlabs/wavs:sha-abc123
    ghcr.io/lay3rlabs/wavs:rc.1.0.0
    Pulling ghcr.io/lay3rlabs/wavs:latest
    Found ghcr.io/lay3rlabs/wavs:0.1.0
    Invalid: docker.io/other/image:1.0
    Using ghcr.io/lay3rlabs/wavs:sha-abc123
    ghcr.io/lay3rlabs/wavs:rc.1.0.0
    ghcr.io/lay3rlabs/wavs:0.3.0-beta
    ghcr.io/lay3rlabs/wavs:1.0.0-alpha
    "

    # Find all matches_set with line numbers (-n) and print the pattern at the top
    echo "Pattern being used: $GREP_PATTERN"
    echo -e "\nmatches_set found:"
    echo "$TEST_DATA" | grep -P -o "$GREP_PATTERN"
}

# test_data
main
````

## File: components/eth-price-oracle/src/bindings.rs
````rust
// Generated by `wit-bindgen` 0.36.0. DO NOT EDIT!
// Options used:
//   * runtime_path: "wit_bindgen_rt"
pub type TriggerAction = wavs::worker::layer_types::TriggerAction;
#[doc(hidden)]
#[allow(non_snake_case)]
pub unsafe fn _export_run_cabi<T: Guest>(arg0: *mut u8) -> *mut u8 {
    #[cfg(target_arch = "wasm32")]
    _rt::run_ctors_once();
    let l0 = *arg0.add(0).cast::<*mut u8>();
    let l1 = *arg0.add(4).cast::<usize>();
    let len2 = l1;
    let bytes2 = _rt::Vec::from_raw_parts(l0.cast(), len2, len2);
    let l3 = *arg0.add(8).cast::<*mut u8>();
    let l4 = *arg0.add(12).cast::<usize>();
    let len5 = l4;
    let bytes5 = _rt::Vec::from_raw_parts(l3.cast(), len5, len5);
    let l6 = i32::from(*arg0.add(16).cast::<u8>());
    use wavs::worker::layer_types::TriggerSource as V26;
    let v26 = match l6 {
        0 => {
            let e26 = {
                let l7 = *arg0.add(20).cast::<*mut u8>();
                let l8 = *arg0.add(24).cast::<usize>();
                let len9 = l8;
                let l10 = *arg0.add(28).cast::<*mut u8>();
                let l11 = *arg0.add(32).cast::<usize>();
                let len12 = l11;
                let bytes12 = _rt::Vec::from_raw_parts(l10.cast(), len12, len12);
                let l13 = *arg0.add(36).cast::<*mut u8>();
                let l14 = *arg0.add(40).cast::<usize>();
                let len15 = l14;
                wavs::worker::layer_types::TriggerSourceEthContractEvent {
                    address: wavs::worker::layer_types::EthAddress {
                        raw_bytes: _rt::Vec::from_raw_parts(l7.cast(), len9, len9),
                    },
                    chain_name: _rt::string_lift(bytes12),
                    event_hash: _rt::Vec::from_raw_parts(l13.cast(), len15, len15),
                }
            };
            V26::EthContractEvent(e26)
        }
        1 => {
            let e26 = {
                let l16 = *arg0.add(20).cast::<*mut u8>();
                let l17 = *arg0.add(24).cast::<usize>();
                let len18 = l17;
                let bytes18 = _rt::Vec::from_raw_parts(l16.cast(), len18, len18);
                let l19 = *arg0.add(28).cast::<i32>();
                let l20 = *arg0.add(32).cast::<*mut u8>();
                let l21 = *arg0.add(36).cast::<usize>();
                let len22 = l21;
                let bytes22 = _rt::Vec::from_raw_parts(l20.cast(), len22, len22);
                let l23 = *arg0.add(40).cast::<*mut u8>();
                let l24 = *arg0.add(44).cast::<usize>();
                let len25 = l24;
                let bytes25 = _rt::Vec::from_raw_parts(l23.cast(), len25, len25);
                wavs::worker::layer_types::TriggerSourceCosmosContractEvent {
                    address: wavs::worker::layer_types::CosmosAddress {
                        bech32_addr: _rt::string_lift(bytes18),
                        prefix_len: l19 as u32,
                    },
                    chain_name: _rt::string_lift(bytes22),
                    event_type: _rt::string_lift(bytes25),
                }
            };
            V26::CosmosContractEvent(e26)
        }
        n => {
            debug_assert_eq!(n, 2, "invalid enum discriminant");
            V26::Manual
        }
    };
    let l27 = i32::from(*arg0.add(48).cast::<u8>());
    use wavs::worker::layer_types::TriggerData as V67;
    let v67 = match l27 {
        0 => {
            let e67 = {
                let l28 = *arg0.add(56).cast::<*mut u8>();
                let l29 = *arg0.add(60).cast::<usize>();
                let len30 = l29;
                let l31 = *arg0.add(64).cast::<*mut u8>();
                let l32 = *arg0.add(68).cast::<usize>();
                let len33 = l32;
                let bytes33 = _rt::Vec::from_raw_parts(l31.cast(), len33, len33);
                let l34 = *arg0.add(72).cast::<*mut u8>();
                let l35 = *arg0.add(76).cast::<usize>();
                let base39 = l34;
                let len39 = l35;
                let mut result39 = _rt::Vec::with_capacity(len39);
                for i in 0..len39 {
                    let base = base39.add(i * 8);
                    let e39 = {
                        let l36 = *base.add(0).cast::<*mut u8>();
                        let l37 = *base.add(4).cast::<usize>();
                        let len38 = l37;
                        _rt::Vec::from_raw_parts(l36.cast(), len38, len38)
                    };
                    result39.push(e39);
                }
                _rt::cabi_dealloc(base39, len39 * 8, 4);
                let l40 = *arg0.add(80).cast::<*mut u8>();
                let l41 = *arg0.add(84).cast::<usize>();
                let len42 = l41;
                let l43 = *arg0.add(88).cast::<i64>();
                wavs::worker::layer_types::TriggerDataEthContractEvent {
                    contract_address: wavs::worker::layer_types::EthAddress {
                        raw_bytes: _rt::Vec::from_raw_parts(l28.cast(), len30, len30),
                    },
                    chain_name: _rt::string_lift(bytes33),
                    log: wavs::worker::layer_types::EthEventLogData {
                        topics: result39,
                        data: _rt::Vec::from_raw_parts(l40.cast(), len42, len42),
                    },
                    block_height: l43 as u64,
                }
            };
            V67::EthContractEvent(e67)
        }
        1 => {
            let e67 = {
                let l44 = *arg0.add(56).cast::<*mut u8>();
                let l45 = *arg0.add(60).cast::<usize>();
                let len46 = l45;
                let bytes46 = _rt::Vec::from_raw_parts(l44.cast(), len46, len46);
                let l47 = *arg0.add(64).cast::<i32>();
                let l48 = *arg0.add(68).cast::<*mut u8>();
                let l49 = *arg0.add(72).cast::<usize>();
                let len50 = l49;
                let bytes50 = _rt::Vec::from_raw_parts(l48.cast(), len50, len50);
                let l51 = *arg0.add(76).cast::<*mut u8>();
                let l52 = *arg0.add(80).cast::<usize>();
                let len53 = l52;
                let bytes53 = _rt::Vec::from_raw_parts(l51.cast(), len53, len53);
                let l54 = *arg0.add(84).cast::<*mut u8>();
                let l55 = *arg0.add(88).cast::<usize>();
                let base62 = l54;
                let len62 = l55;
                let mut result62 = _rt::Vec::with_capacity(len62);
                for i in 0..len62 {
                    let base = base62.add(i * 16);
                    let e62 = {
                        let l56 = *base.add(0).cast::<*mut u8>();
                        let l57 = *base.add(4).cast::<usize>();
                        let len58 = l57;
                        let bytes58 = _rt::Vec::from_raw_parts(l56.cast(), len58, len58);
                        let l59 = *base.add(8).cast::<*mut u8>();
                        let l60 = *base.add(12).cast::<usize>();
                        let len61 = l60;
                        let bytes61 = _rt::Vec::from_raw_parts(l59.cast(), len61, len61);
                        (_rt::string_lift(bytes58), _rt::string_lift(bytes61))
                    };
                    result62.push(e62);
                }
                _rt::cabi_dealloc(base62, len62 * 16, 4);
                let l63 = *arg0.add(96).cast::<i64>();
                wavs::worker::layer_types::TriggerDataCosmosContractEvent {
                    contract_address: wavs::worker::layer_types::CosmosAddress {
                        bech32_addr: _rt::string_lift(bytes46),
                        prefix_len: l47 as u32,
                    },
                    chain_name: _rt::string_lift(bytes50),
                    event: wavs::worker::layer_types::CosmosEvent {
                        ty: _rt::string_lift(bytes53),
                        attributes: result62,
                    },
                    block_height: l63 as u64,
                }
            };
            V67::CosmosContractEvent(e67)
        }
        n => {
            debug_assert_eq!(n, 2, "invalid enum discriminant");
            let e67 = {
                let l64 = *arg0.add(56).cast::<*mut u8>();
                let l65 = *arg0.add(60).cast::<usize>();
                let len66 = l65;
                _rt::Vec::from_raw_parts(l64.cast(), len66, len66)
            };
            V67::Raw(e67)
        }
    };
    let result68 = T::run(wavs::worker::layer_types::TriggerAction {
        config: wavs::worker::layer_types::TriggerConfig {
            service_id: _rt::string_lift(bytes2),
            workflow_id: _rt::string_lift(bytes5),
            trigger_source: v26,
        },
        data: v67,
    });
    _rt::cabi_dealloc(arg0, 104, 8);
    let ptr69 = _RET_AREA.0.as_mut_ptr().cast::<u8>();
    match result68 {
        Ok(e) => {
            *ptr69.add(0).cast::<u8>() = (0i32) as u8;
            match e {
                Some(e) => {
                    *ptr69.add(4).cast::<u8>() = (1i32) as u8;
                    let vec70 = (e).into_boxed_slice();
                    let ptr70 = vec70.as_ptr().cast::<u8>();
                    let len70 = vec70.len();
                    ::core::mem::forget(vec70);
                    *ptr69.add(12).cast::<usize>() = len70;
                    *ptr69.add(8).cast::<*mut u8>() = ptr70.cast_mut();
                }
                None => {
                    *ptr69.add(4).cast::<u8>() = (0i32) as u8;
                }
            };
        }
        Err(e) => {
            *ptr69.add(0).cast::<u8>() = (1i32) as u8;
            let vec71 = (e.into_bytes()).into_boxed_slice();
            let ptr71 = vec71.as_ptr().cast::<u8>();
            let len71 = vec71.len();
            ::core::mem::forget(vec71);
            *ptr69.add(8).cast::<usize>() = len71;
            *ptr69.add(4).cast::<*mut u8>() = ptr71.cast_mut();
        }
    };
    ptr69
}
#[doc(hidden)]
#[allow(non_snake_case)]
pub unsafe fn __post_return_run<T: Guest>(arg0: *mut u8) {
    let l0 = i32::from(*arg0.add(0).cast::<u8>());
    match l0 {
        0 => {
            let l1 = i32::from(*arg0.add(4).cast::<u8>());
            match l1 {
                0 => {}
                _ => {
                    let l2 = *arg0.add(8).cast::<*mut u8>();
                    let l3 = *arg0.add(12).cast::<usize>();
                    let base4 = l2;
                    let len4 = l3;
                    _rt::cabi_dealloc(base4, len4 * 1, 1);
                }
            }
        }
        _ => {
            let l5 = *arg0.add(4).cast::<*mut u8>();
            let l6 = *arg0.add(8).cast::<usize>();
            _rt::cabi_dealloc(l5, l6, 1);
        }
    }
}
pub trait Guest {
    fn run(trigger_action: TriggerAction) -> Result<Option<_rt::Vec<u8>>, _rt::String>;
}
#[doc(hidden)]
macro_rules! __export_world_layer_trigger_world_cabi {
    ($ty:ident with_types_in $($path_to_types:tt)*) => {
        const _ : () = { #[export_name = "run"] unsafe extern "C" fn export_run(arg0 : *
        mut u8,) -> * mut u8 { $($path_to_types)*:: _export_run_cabi::<$ty > (arg0) }
        #[export_name = "cabi_post_run"] unsafe extern "C" fn _post_return_run(arg0 : *
        mut u8,) { $($path_to_types)*:: __post_return_run::<$ty > (arg0) } };
    };
}
#[doc(hidden)]
pub(crate) use __export_world_layer_trigger_world_cabi;
#[repr(align(4))]
struct _RetArea([::core::mem::MaybeUninit<u8>; 16]);
static mut _RET_AREA: _RetArea = _RetArea([::core::mem::MaybeUninit::uninit(); 16]);
#[rustfmt::skip]
#[allow(dead_code, clippy::all)]
pub mod wavs {
    pub mod worker {
        #[allow(dead_code, clippy::all)]
        pub mod layer_types {
            #[used]
            #[doc(hidden)]
            static __FORCE_SECTION_REF: fn() = super::super::super::__link_custom_section_describing_imports;
            use super::super::super::_rt;
            #[derive(Clone)]
            pub struct CosmosAddress {
                pub bech32_addr: _rt::String,
                /// prefix is the first part of the bech32 address
                pub prefix_len: u32,
            }
            impl ::core::fmt::Debug for CosmosAddress {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("CosmosAddress")
                        .field("bech32-addr", &self.bech32_addr)
                        .field("prefix-len", &self.prefix_len)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct CosmosEvent {
                pub ty: _rt::String,
                pub attributes: _rt::Vec<(_rt::String, _rt::String)>,
            }
            impl ::core::fmt::Debug for CosmosEvent {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("CosmosEvent")
                        .field("ty", &self.ty)
                        .field("attributes", &self.attributes)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct CosmosChainConfig {
                pub chain_id: _rt::String,
                pub rpc_endpoint: Option<_rt::String>,
                pub grpc_endpoint: Option<_rt::String>,
                pub grpc_web_endpoint: Option<_rt::String>,
                pub gas_price: f32,
                pub gas_denom: _rt::String,
                pub bech32_prefix: _rt::String,
            }
            impl ::core::fmt::Debug for CosmosChainConfig {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("CosmosChainConfig")
                        .field("chain-id", &self.chain_id)
                        .field("rpc-endpoint", &self.rpc_endpoint)
                        .field("grpc-endpoint", &self.grpc_endpoint)
                        .field("grpc-web-endpoint", &self.grpc_web_endpoint)
                        .field("gas-price", &self.gas_price)
                        .field("gas-denom", &self.gas_denom)
                        .field("bech32-prefix", &self.bech32_prefix)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct EthAddress {
                pub raw_bytes: _rt::Vec<u8>,
            }
            impl ::core::fmt::Debug for EthAddress {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("EthAddress")
                        .field("raw-bytes", &self.raw_bytes)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct EthEventLogData {
                /// the raw log topics that can be decoded into an event
                pub topics: _rt::Vec<_rt::Vec<u8>>,
                /// the raw log data that can be decoded into an event
                pub data: _rt::Vec<u8>,
            }
            impl ::core::fmt::Debug for EthEventLogData {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("EthEventLogData")
                        .field("topics", &self.topics)
                        .field("data", &self.data)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct EthChainConfig {
                pub chain_id: _rt::String,
                pub ws_endpoint: Option<_rt::String>,
                pub http_endpoint: Option<_rt::String>,
            }
            impl ::core::fmt::Debug for EthChainConfig {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("EthChainConfig")
                        .field("chain-id", &self.chain_id)
                        .field("ws-endpoint", &self.ws_endpoint)
                        .field("http-endpoint", &self.http_endpoint)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct TriggerSourceEthContractEvent {
                pub address: EthAddress,
                pub chain_name: _rt::String,
                pub event_hash: _rt::Vec<u8>,
            }
            impl ::core::fmt::Debug for TriggerSourceEthContractEvent {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerSourceEthContractEvent")
                        .field("address", &self.address)
                        .field("chain-name", &self.chain_name)
                        .field("event-hash", &self.event_hash)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct TriggerSourceCosmosContractEvent {
                pub address: CosmosAddress,
                pub chain_name: _rt::String,
                pub event_type: _rt::String,
            }
            impl ::core::fmt::Debug for TriggerSourceCosmosContractEvent {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerSourceCosmosContractEvent")
                        .field("address", &self.address)
                        .field("chain-name", &self.chain_name)
                        .field("event-type", &self.event_type)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub enum TriggerSource {
                EthContractEvent(TriggerSourceEthContractEvent),
                CosmosContractEvent(TriggerSourceCosmosContractEvent),
                Manual,
            }
            impl ::core::fmt::Debug for TriggerSource {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    match self {
                        TriggerSource::EthContractEvent(e) => {
                            f.debug_tuple("TriggerSource::EthContractEvent")
                                .field(e)
                                .finish()
                        }
                        TriggerSource::CosmosContractEvent(e) => {
                            f.debug_tuple("TriggerSource::CosmosContractEvent")
                                .field(e)
                                .finish()
                        }
                        TriggerSource::Manual => {
                            f.debug_tuple("TriggerSource::Manual").finish()
                        }
                    }
                }
            }
            #[derive(Clone)]
            pub struct TriggerConfig {
                pub service_id: _rt::String,
                pub workflow_id: _rt::String,
                pub trigger_source: TriggerSource,
            }
            impl ::core::fmt::Debug for TriggerConfig {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerConfig")
                        .field("service-id", &self.service_id)
                        .field("workflow-id", &self.workflow_id)
                        .field("trigger-source", &self.trigger_source)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct TriggerDataEthContractEvent {
                pub contract_address: EthAddress,
                pub chain_name: _rt::String,
                pub log: EthEventLogData,
                pub block_height: u64,
            }
            impl ::core::fmt::Debug for TriggerDataEthContractEvent {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerDataEthContractEvent")
                        .field("contract-address", &self.contract_address)
                        .field("chain-name", &self.chain_name)
                        .field("log", &self.log)
                        .field("block-height", &self.block_height)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub struct TriggerDataCosmosContractEvent {
                pub contract_address: CosmosAddress,
                pub chain_name: _rt::String,
                pub event: CosmosEvent,
                pub block_height: u64,
            }
            impl ::core::fmt::Debug for TriggerDataCosmosContractEvent {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerDataCosmosContractEvent")
                        .field("contract-address", &self.contract_address)
                        .field("chain-name", &self.chain_name)
                        .field("event", &self.event)
                        .field("block-height", &self.block_height)
                        .finish()
                }
            }
            #[derive(Clone)]
            pub enum TriggerData {
                EthContractEvent(TriggerDataEthContractEvent),
                CosmosContractEvent(TriggerDataCosmosContractEvent),
                Raw(_rt::Vec<u8>),
            }
            impl ::core::fmt::Debug for TriggerData {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    match self {
                        TriggerData::EthContractEvent(e) => {
                            f.debug_tuple("TriggerData::EthContractEvent")
                                .field(e)
                                .finish()
                        }
                        TriggerData::CosmosContractEvent(e) => {
                            f.debug_tuple("TriggerData::CosmosContractEvent")
                                .field(e)
                                .finish()
                        }
                        TriggerData::Raw(e) => {
                            f.debug_tuple("TriggerData::Raw").field(e).finish()
                        }
                    }
                }
            }
            #[derive(Clone)]
            pub struct TriggerAction {
                pub config: TriggerConfig,
                pub data: TriggerData,
            }
            impl ::core::fmt::Debug for TriggerAction {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    f.debug_struct("TriggerAction")
                        .field("config", &self.config)
                        .field("data", &self.data)
                        .finish()
                }
            }
            #[derive(Clone, Copy)]
            pub enum LogLevel {
                Error,
                Warn,
                Info,
                Debug,
                Trace,
            }
            impl ::core::fmt::Debug for LogLevel {
                fn fmt(
                    &self,
                    f: &mut ::core::fmt::Formatter<'_>,
                ) -> ::core::fmt::Result {
                    match self {
                        LogLevel::Error => f.debug_tuple("LogLevel::Error").finish(),
                        LogLevel::Warn => f.debug_tuple("LogLevel::Warn").finish(),
                        LogLevel::Info => f.debug_tuple("LogLevel::Info").finish(),
                        LogLevel::Debug => f.debug_tuple("LogLevel::Debug").finish(),
                        LogLevel::Trace => f.debug_tuple("LogLevel::Trace").finish(),
                    }
                }
            }
        }
    }
}
#[allow(dead_code, clippy::all)]
pub mod host {
    #[used]
    #[doc(hidden)]
    static __FORCE_SECTION_REF: fn() = super::__link_custom_section_describing_imports;
    use super::_rt;
    pub type EthChainConfig = super::wavs::worker::layer_types::EthChainConfig;
    pub type CosmosChainConfig = super::wavs::worker::layer_types::CosmosChainConfig;
    pub type LogLevel = super::wavs::worker::layer_types::LogLevel;
    #[allow(unused_unsafe, clippy::all)]
    pub fn get_eth_chain_config(chain_name: &str) -> Option<EthChainConfig> {
        unsafe {
            #[repr(align(4))]
            struct RetArea([::core::mem::MaybeUninit<u8>; 36]);
            let mut ret_area = RetArea([::core::mem::MaybeUninit::uninit(); 36]);
            let vec0 = chain_name;
            let ptr0 = vec0.as_ptr().cast::<u8>();
            let len0 = vec0.len();
            let ptr1 = ret_area.0.as_mut_ptr().cast::<u8>();
            #[cfg(target_arch = "wasm32")]
            #[link(wasm_import_module = "host")]
            extern "C" {
                #[link_name = "get-eth-chain-config"]
                fn wit_import(_: *mut u8, _: usize, _: *mut u8);
            }
            #[cfg(not(target_arch = "wasm32"))]
            fn wit_import(_: *mut u8, _: usize, _: *mut u8) {
                unreachable!()
            }
            wit_import(ptr0.cast_mut(), len0, ptr1);
            let l2 = i32::from(*ptr1.add(0).cast::<u8>());
            match l2 {
                0 => None,
                1 => {
                    let e = {
                        let l3 = *ptr1.add(4).cast::<*mut u8>();
                        let l4 = *ptr1.add(8).cast::<usize>();
                        let len5 = l4;
                        let bytes5 = _rt::Vec::from_raw_parts(l3.cast(), len5, len5);
                        let l6 = i32::from(*ptr1.add(12).cast::<u8>());
                        let l10 = i32::from(*ptr1.add(24).cast::<u8>());
                        super::wavs::worker::layer_types::EthChainConfig {
                            chain_id: _rt::string_lift(bytes5),
                            ws_endpoint: match l6 {
                                0 => None,
                                1 => {
                                    let e = {
                                        let l7 = *ptr1.add(16).cast::<*mut u8>();
                                        let l8 = *ptr1.add(20).cast::<usize>();
                                        let len9 = l8;
                                        let bytes9 =
                                            _rt::Vec::from_raw_parts(l7.cast(), len9, len9);
                                        _rt::string_lift(bytes9)
                                    };
                                    Some(e)
                                }
                                _ => _rt::invalid_enum_discriminant(),
                            },
                            http_endpoint: match l10 {
                                0 => None,
                                1 => {
                                    let e = {
                                        let l11 = *ptr1.add(28).cast::<*mut u8>();
                                        let l12 = *ptr1.add(32).cast::<usize>();
                                        let len13 = l12;
                                        let bytes13 =
                                            _rt::Vec::from_raw_parts(l11.cast(), len13, len13);
                                        _rt::string_lift(bytes13)
                                    };
                                    Some(e)
                                }
                                _ => _rt::invalid_enum_discriminant(),
                            },
                        }
                    };
                    Some(e)
                }
                _ => _rt::invalid_enum_discriminant(),
            }
        }
    }
    #[allow(unused_unsafe, clippy::all)]
    pub fn get_cosmos_chain_config(chain_name: &str) -> Option<CosmosChainConfig> {
        unsafe {
            #[repr(align(4))]
            struct RetArea([::core::mem::MaybeUninit<u8>; 68]);
            let mut ret_area = RetArea([::core::mem::MaybeUninit::uninit(); 68]);
            let vec0 = chain_name;
            let ptr0 = vec0.as_ptr().cast::<u8>();
            let len0 = vec0.len();
            let ptr1 = ret_area.0.as_mut_ptr().cast::<u8>();
            #[cfg(target_arch = "wasm32")]
            #[link(wasm_import_module = "host")]
            extern "C" {
                #[link_name = "get-cosmos-chain-config"]
                fn wit_import(_: *mut u8, _: usize, _: *mut u8);
            }
            #[cfg(not(target_arch = "wasm32"))]
            fn wit_import(_: *mut u8, _: usize, _: *mut u8) {
                unreachable!()
            }
            wit_import(ptr0.cast_mut(), len0, ptr1);
            let l2 = i32::from(*ptr1.add(0).cast::<u8>());
            match l2 {
                0 => None,
                1 => {
                    let e = {
                        let l3 = *ptr1.add(4).cast::<*mut u8>();
                        let l4 = *ptr1.add(8).cast::<usize>();
                        let len5 = l4;
                        let bytes5 = _rt::Vec::from_raw_parts(l3.cast(), len5, len5);
                        let l6 = i32::from(*ptr1.add(12).cast::<u8>());
                        let l10 = i32::from(*ptr1.add(24).cast::<u8>());
                        let l14 = i32::from(*ptr1.add(36).cast::<u8>());
                        let l18 = *ptr1.add(48).cast::<f32>();
                        let l19 = *ptr1.add(52).cast::<*mut u8>();
                        let l20 = *ptr1.add(56).cast::<usize>();
                        let len21 = l20;
                        let bytes21 = _rt::Vec::from_raw_parts(l19.cast(), len21, len21);
                        let l22 = *ptr1.add(60).cast::<*mut u8>();
                        let l23 = *ptr1.add(64).cast::<usize>();
                        let len24 = l23;
                        let bytes24 = _rt::Vec::from_raw_parts(l22.cast(), len24, len24);
                        super::wavs::worker::layer_types::CosmosChainConfig {
                            chain_id: _rt::string_lift(bytes5),
                            rpc_endpoint: match l6 {
                                0 => None,
                                1 => {
                                    let e = {
                                        let l7 = *ptr1.add(16).cast::<*mut u8>();
                                        let l8 = *ptr1.add(20).cast::<usize>();
                                        let len9 = l8;
                                        let bytes9 =
                                            _rt::Vec::from_raw_parts(l7.cast(), len9, len9);
                                        _rt::string_lift(bytes9)
                                    };
                                    Some(e)
                                }
                                _ => _rt::invalid_enum_discriminant(),
                            },
                            grpc_endpoint: match l10 {
                                0 => None,
                                1 => {
                                    let e = {
                                        let l11 = *ptr1.add(28).cast::<*mut u8>();
                                        let l12 = *ptr1.add(32).cast::<usize>();
                                        let len13 = l12;
                                        let bytes13 =
                                            _rt::Vec::from_raw_parts(l11.cast(), len13, len13);
                                        _rt::string_lift(bytes13)
                                    };
                                    Some(e)
                                }
                                _ => _rt::invalid_enum_discriminant(),
                            },
                            grpc_web_endpoint: match l14 {
                                0 => None,
                                1 => {
                                    let e = {
                                        let l15 = *ptr1.add(40).cast::<*mut u8>();
                                        let l16 = *ptr1.add(44).cast::<usize>();
                                        let len17 = l16;
                                        let bytes17 =
                                            _rt::Vec::from_raw_parts(l15.cast(), len17, len17);
                                        _rt::string_lift(bytes17)
                                    };
                                    Some(e)
                                }
                                _ => _rt::invalid_enum_discriminant(),
                            },
                            gas_price: l18,
                            gas_denom: _rt::string_lift(bytes21),
                            bech32_prefix: _rt::string_lift(bytes24),
                        }
                    };
                    Some(e)
                }
                _ => _rt::invalid_enum_discriminant(),
            }
        }
    }
    #[allow(unused_unsafe, clippy::all)]
    pub fn log(level: LogLevel, message: &str) {
        unsafe {
            use super::wavs::worker::layer_types::LogLevel as V0;
            let result1 = match level {
                V0::Error => 0i32,
                V0::Warn => 1i32,
                V0::Info => 2i32,
                V0::Debug => 3i32,
                V0::Trace => 4i32,
            };
            let vec2 = message;
            let ptr2 = vec2.as_ptr().cast::<u8>();
            let len2 = vec2.len();
            #[cfg(target_arch = "wasm32")]
            #[link(wasm_import_module = "host")]
            extern "C" {
                #[link_name = "log"]
                fn wit_import(_: i32, _: *mut u8, _: usize);
            }
            #[cfg(not(target_arch = "wasm32"))]
            fn wit_import(_: i32, _: *mut u8, _: usize) {
                unreachable!()
            }
            wit_import(result1, ptr2.cast_mut(), len2);
        }
    }
}
#[rustfmt::skip]
mod _rt {
    pub use alloc_crate::string::String;
    pub use alloc_crate::vec::Vec;
    pub unsafe fn string_lift(bytes: Vec<u8>) -> String {
        if cfg!(debug_assertions) {
            String::from_utf8(bytes).unwrap()
        } else {
            String::from_utf8_unchecked(bytes)
        }
    }
    pub unsafe fn invalid_enum_discriminant<T>() -> T {
        if cfg!(debug_assertions) {
            panic!("invalid enum discriminant")
        } else {
            core::hint::unreachable_unchecked()
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn run_ctors_once() {
        wit_bindgen_rt::run_ctors_once();
    }
    pub unsafe fn cabi_dealloc(ptr: *mut u8, size: usize, align: usize) {
        if size == 0 {
            return;
        }
        let layout = alloc::Layout::from_size_align_unchecked(size, align);
        alloc::dealloc(ptr, layout);
    }
    extern crate alloc as alloc_crate;
    pub use alloc_crate::alloc;
}
/// Generates `#[no_mangle]` functions to export the specified type as the
/// root implementation of all generated traits.
///
/// For more information see the documentation of `wit_bindgen::generate!`.
///
/// ```rust
/// # macro_rules! export{ ($($t:tt)*) => (); }
/// # trait Guest {}
/// struct MyType;
///
/// impl Guest for MyType {
///     // ...
/// }
///
/// export!(MyType);
/// ```
#[allow(unused_macros)]
#[doc(hidden)]
macro_rules! __export_layer_trigger_world_impl {
    ($ty:ident) => {
        self::export!($ty with_types_in self);
    };
    ($ty:ident with_types_in $($path_to_types_root:tt)*) => {
        $($path_to_types_root)*:: __export_world_layer_trigger_world_cabi!($ty
        with_types_in $($path_to_types_root)*);
    };
}
#[doc(inline)]
pub(crate) use __export_layer_trigger_world_impl as export;
#[cfg(target_arch = "wasm32")]
#[link_section = "component-type:wit-bindgen:0.36.0:wavs:worker@0.3.0:layer-trigger-world:encoded world"]
#[doc(hidden)]
pub static __WIT_BINDGEN_COMPONENT_TYPE: [u8; 1580] = *b"\
\0asm\x0d\0\x01\0\0\x19\x16wit-component-encoding\x04\0\x07\xa2\x0b\x01A\x02\x01\
A\x0e\x01B#\x01r\x02\x0bbech32-addrs\x0aprefix-leny\x04\0\x0ecosmos-address\x03\0\
\0\x01o\x02ss\x01p\x02\x01r\x02\x02tys\x0aattributes\x03\x04\0\x0ccosmos-event\x03\
\0\x04\x01ks\x01r\x07\x08chain-ids\x0crpc-endpoint\x06\x0dgrpc-endpoint\x06\x11g\
rpc-web-endpoint\x06\x09gas-pricev\x09gas-denoms\x0dbech32-prefixs\x04\0\x13cosm\
os-chain-config\x03\0\x07\x01p}\x01r\x01\x09raw-bytes\x09\x04\0\x0beth-address\x03\
\0\x0a\x01p\x09\x01r\x02\x06topics\x0c\x04data\x09\x04\0\x12eth-event-log-data\x03\
\0\x0d\x01r\x03\x08chain-ids\x0bws-endpoint\x06\x0dhttp-endpoint\x06\x04\0\x10et\
h-chain-config\x03\0\x0f\x01r\x03\x07address\x0b\x0achain-names\x0aevent-hash\x09\
\x04\0!trigger-source-eth-contract-event\x03\0\x11\x01r\x03\x07address\x01\x0ach\
ain-names\x0aevent-types\x04\0$trigger-source-cosmos-contract-event\x03\0\x13\x01\
q\x03\x12eth-contract-event\x01\x12\0\x15cosmos-contract-event\x01\x14\0\x06manu\
al\0\0\x04\0\x0etrigger-source\x03\0\x15\x01r\x03\x0aservice-ids\x0bworkflow-ids\
\x0etrigger-source\x16\x04\0\x0etrigger-config\x03\0\x17\x01r\x04\x10contract-ad\
dress\x0b\x0achain-names\x03log\x0e\x0cblock-heightw\x04\0\x1ftrigger-data-eth-c\
ontract-event\x03\0\x19\x01r\x04\x10contract-address\x01\x0achain-names\x05event\
\x05\x0cblock-heightw\x04\0\"trigger-data-cosmos-contract-event\x03\0\x1b\x01q\x03\
\x12eth-contract-event\x01\x1a\0\x15cosmos-contract-event\x01\x1c\0\x03raw\x01\x09\
\0\x04\0\x0ctrigger-data\x03\0\x1d\x01r\x02\x06config\x18\x04data\x1e\x04\0\x0et\
rigger-action\x03\0\x1f\x01q\x05\x05error\0\0\x04warn\0\0\x04info\0\0\x05debug\0\
\0\x05trace\0\0\x04\0\x09log-level\x03\0!\x03\0\x1dwavs:worker/layer-types@0.3.0\
\x05\0\x02\x03\0\0\x0etrigger-action\x03\0\x0etrigger-action\x03\0\x01\x02\x03\0\
\0\x10eth-chain-config\x02\x03\0\0\x13cosmos-chain-config\x02\x03\0\0\x09log-lev\
el\x01B\x0e\x02\x03\x02\x01\x03\x04\0\x10eth-chain-config\x03\0\0\x02\x03\x02\x01\
\x04\x04\0\x13cosmos-chain-config\x03\0\x02\x02\x03\x02\x01\x05\x04\0\x09log-lev\
el\x03\0\x04\x01k\x01\x01@\x01\x0achain-names\0\x06\x04\0\x14get-eth-chain-confi\
g\x01\x07\x01k\x03\x01@\x01\x0achain-names\0\x08\x04\0\x17get-cosmos-chain-confi\
g\x01\x09\x01@\x02\x05level\x05\x07messages\x01\0\x04\0\x03log\x01\x0a\x03\0\x04\
host\x05\x06\x01p}\x01k\x07\x01j\x01\x08\x01s\x01@\x01\x0etrigger-action\x02\0\x09\
\x04\0\x03run\x01\x0a\x04\0%wavs:worker/layer-trigger-world@0.3.0\x04\0\x0b\x19\x01\
\0\x13layer-trigger-world\x03\0\0\0G\x09producers\x01\x0cprocessed-by\x02\x0dwit\
-component\x070.220.0\x10wit-bindgen-rust\x060.36.0";
#[inline(never)]
#[doc(hidden)]
pub fn __link_custom_section_describing_imports() {
    wit_bindgen_rt::maybe_link_cabi_realloc();
}
````

## File: components/eth-price-oracle/src/lib.rs
````rust
mod trigger;
use trigger::{decode_trigger_event, encode_trigger_output, Destination};
use wavs_wasi_chain::http::{fetch_json, http_request_get};
pub mod bindings;
use crate::bindings::{export, Guest, TriggerAction};
use serde::{Deserialize, Serialize};
use wstd::{http::HeaderValue, runtime::block_on};

struct Component;
export!(Component with_types_in bindings);

impl Guest for Component {
    fn run(action: TriggerAction) -> std::result::Result<Option<Vec<u8>>, String> {
        let (trigger_id, req, dest) =
            decode_trigger_event(action.data).map_err(|e| e.to_string())?;

        // Convert bytes to string and parse first char as u64
        let input = std::str::from_utf8(&req).map_err(|e| e.to_string())?;
        println!("input id: {}", input);

        let id = input.chars().next().ok_or("Empty input")?;
        let id = id.to_digit(16).ok_or("Invalid hex digit")? as u64;

        let res = block_on(async move {
            let resp_data = get_price_feed(id).await?;
            println!("resp_data: {:?}", resp_data);
            serde_json::to_vec(&resp_data).map_err(|e| e.to_string())
        })?;

        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}

async fn get_price_feed(id: u64) -> Result<PriceFeedData, String> {
    let url = format!(
        "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id={}&range=1h",
        id
    );

    let current_time = std::time::SystemTime::now().elapsed().unwrap().as_secs();

    let mut req = http_request_get(&url).map_err(|e| e.to_string())?;
    req.headers_mut().insert("Accept", HeaderValue::from_static("application/json"));
    req.headers_mut().insert("Content-Type", HeaderValue::from_static("application/json"));
    req.headers_mut()
        .insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"));
    req.headers_mut().insert(
        "Cookie",
        HeaderValue::from_str(&format!("myrandom_cookie={}", current_time)).unwrap(),
    );

    let json: Root = fetch_json(req).await.map_err(|e| e.to_string())?;

    Ok(PriceFeedData {
        symbol: json.data.symbol,
        price: json.data.statistics.price,
        timestamp: json.status.timestamp,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceFeedData {
    symbol: String,
    timestamp: String,
    price: f64,
}

/// -----
/// <https://transform.tools/json-to-rust-serde>
/// Generated from <https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id=1&range=1h>
/// -----
///
#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub data: Data,
    pub status: Status,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Data {
    pub id: f64,
    pub name: String,
    pub symbol: String,
    pub statistics: Statistics,
    pub description: String,
    pub category: String,
    pub slug: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Statistics {
    pub price: f64,
    #[serde(rename = "totalSupply")]
    pub total_supply: f64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CoinBitesVideo {
    pub id: String,
    pub category: String,
    #[serde(rename = "videoUrl")]
    pub video_url: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "previewImage")]
    pub preview_image: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Status {
    pub timestamp: String,
    pub error_code: String,
    pub error_message: String,
    pub elapsed: String,
    pub credit_count: f64,
}
````

## File: components/eth-price-oracle/src/trigger.rs
````rust
use crate::bindings::wavs::worker::layer_types::{TriggerData, TriggerDataEthContractEvent};
use alloy_sol_types::SolValue;
use anyhow::Result;
use wavs_wasi_chain::decode_event_log_data;

pub enum Destination {
    Ethereum,
    CliOutput,
}

pub fn decode_trigger_event(trigger_data: TriggerData) -> Result<(u64, Vec<u8>, Destination)> {
    match trigger_data {
        TriggerData::EthContractEvent(TriggerDataEthContractEvent { log, .. }) => {
            let event: solidity::NewTrigger = decode_event_log_data!(log)?;
            let trigger_info = solidity::TriggerInfo::abi_decode(&event._triggerInfo, false)?;
            Ok((trigger_info.triggerId, trigger_info.data.to_vec(), Destination::Ethereum))
        }
        TriggerData::Raw(data) => Ok((0, data.clone(), Destination::CliOutput)),
        _ => Err(anyhow::anyhow!("Unsupported trigger data type")),
    }
}

pub fn encode_trigger_output(trigger_id: u64, output: impl AsRef<[u8]>) -> Vec<u8> {
    solidity::DataWithId { triggerId: trigger_id, data: output.as_ref().to_vec().into() }
        .abi_encode()
}

mod solidity {
    use alloy_sol_macro::sol;
    pub use ITypes::*;

    sol!("../../src/interfaces/ITypes.sol");
}
````

## File: components/eth-price-oracle/Cargo.toml
````toml
[package]
name = "eth-price-oracle"
edition.workspace = true
version.workspace = true
authors.workspace = true
rust-version.workspace = true
repository.workspace = true

[dependencies]
wit-bindgen-rt = {workspace = true}
wavs-wasi-chain = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
alloy-sol-macro = { workspace = true }
wstd = { workspace = true }
alloy-sol-types = { workspace = true }
anyhow = { workspace = true }

[lib]
crate-type = ["cdylib"]

[profile.release]
codegen-units = 1
opt-level = "s"
debug = false
strip = true
lto = true

[package.metadata.component]
package = "component:eth-price-oracle"
target = "wavs:worker/layer-trigger-world@0.3.0"
````

## File: docs/tutorial/1-overview.mdx
````
---
title: 1. Oracle Service Overview
---
<!--docsignore
import { HomeIcon, AppWindow, CircuitBoard, Layers, Microscope, Grid2x2, CloudSun, ChevronRight } from 'lucide-react';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Scrollycoding } from "@/components/scrollycoding";
import { link } from "@/components/link.tsx";
docsignore-->

<img alt="Start-building" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/start-building.png" />

In this guide, you will build a simple oracle service that fetches Bitcoin price data from [coinmarketcap.com](https://coinmarketcap.com/api/). This example is built using the [WAVS Foundry Template](https://github.com/Lay3rLabs/wavs-foundry-template), which contains the tools you need to build your own custom service.

The price oracle service example has three basic parts:

1. [A trigger](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsTrigger.sol): A trigger can be any on-chain event emitted from a contract. This event **triggers** a service to run. In the WAVS Foundry Template, there is a simple trigger contract that stores trigger requests, assigns them unique IDs, and emits an event when a new trigger is added. In this example, the trigger event will pass data pertaining to the ID of an asset for the CoinMarketCap price feed.

2. [A service component](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs): The service component contains the business logic of a service. It is written in Rust (support for more languages is coming soon), compiled to WASM, and run by operators in the WAVS runtime. In this example, operators will listen for a new trigger event to be emitted and then run the service component off-chain, using the asset ID data from the trigger event as input. The component contains logic to fetch the price of the asset from the CoinMarketCap price feed API, which is then processed and encoded before being sent back on-chain.

3. [A submission contract](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsSubmit.sol): Also known as the “service handler,” this contract contains the on-chain submission logic for the service. It validates and stores the processed data returned by the WAVS component. When an operator submits a response, the contract verifies the data’s integrity by checking the operator’s signature and then associates it with the original trigger ID, bringing the queried price on-chain.

These three parts come together to create a basic oracle service using WAVS. To learn more about services and how they work, visit the [How it works page](../how-it-works).

## Video tutorial

You can follow along with this guide by watching the video tutorial:
   <div style={{display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "2em"}}>
     <iframe width="560" height="315" src="https://www.youtube.com/embed/X3XCbSF9Epc" title="WAVS Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
   </div>


<Card
  icon={<ChevronRight />}
  href="/tutorial/2-setup"
  title="Get Started"
  description="Click here to set up your environment and start building your service."
/>
````

## File: docs/tutorial/2-setup.mdx
````
---
title: 2. System setup
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

The following installations are required to run this example. Follow the steps below to set up your system.

<Callout title="System recommendations" type="info">

This tutorial is designed for Windows WSL, Linux, and macOS systems.

</Callout>

## Environment

Install [VS Code](https://code.visualstudio.com/download) and the [Solidity extension](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) if you don't already have them.

## Rust

Run the following command to install [Rust](https://www.rust-lang.org/tools/install).

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

<Callout title="Fresh Install" type="info">

If you just installed Rust for the first time, you will need to run the following commands:

```bash
# Install required target and toolchain
rustup toolchain install stable
rustup target add wasm32-wasip2
```
</Callout>


<Callout title="Upgrade Rust" type="info">

If you already have a previous version of Rust installed, you will need to run the following commands to upgrade it to the latest stable version:

```bash
# Remove old targets if present
rustup target remove wasm32-wasi || true
rustup target remove wasm32-wasip1 || true

# Update and add required target
rustup update stable
rustup target add wasm32-wasip2
```
</Callout>


## Cargo Components

Install the following for building WebAssembly components. Visit the [Cargo Component documentation](https://github.com/bytecodealliance/cargo-component#installation) for more information.

{/* This section is also in [](./5-build.mdx). Remember to update there as well */}
```bash
cargo install cargo-binstall
cargo binstall cargo-component warg-cli wkg --locked --no-confirm --force

# Configure default registry
wkg config --default-registry wa.dev
```

## Foundry

[Foundry](https://book.getfoundry.sh/) is a solidity development suite. The Foundry toolchain contains Anvil (a local testnet node), Forge (build and test smart contracts), Cast (an RPC call CLI), and Chisel (a Solidity REPL).


1. Install Foundryup, the official Foundry installer.

```bash
curl -L https://foundry.paradigm.xyz | bash
```

2. Install Foundry

```bash
foundryup
```

## Docker

Visit the [Docker Documentation](https://docs.docker.com/get-started/get-docker/) for more info.

<Tabs groupId="language" items={['MacOS', 'Linux']} persist>

  <Tab value="MacOS">
    ```bash
    brew install --cask docker
    ```
  </Tab>

  <Tab value="Linux">

  The following commands will install Docker and [Docker Compose](https://docs.docker.com/compose/).

    ```bash
    # Install Docker
    sudo apt -y install docker.io
    # Install Docker Compose
    sudo apt-get install docker-compose-v2
    ```
  </Tab>

</Tabs>

<Callout title="Docker for MacOS" type="warn">

{/* This section is also in [](./5-build.mdx). Remember to update there as well */}

If you are using Docker Desktop, make sure it is open and running for this tutorial.

Before proceeding, make sure that the following setting is updated:

**Enable Host Networking**: Open Docker and navigate to -> Settings -> Resources -> Network. Make sure that 'Enable Host Networking' is turned on.

Alternatively, you can install the following:

```bash
brew install chipmk/tap/docker-mac-net-connect && sudo brew services start chipmk/tap/docker-mac-net-connect
```

If you are running on a Mac with an ARM chip, you will need to do the following:

- Set up Rosetta:

```bash
softwareupdate --install-rosetta`
```

- Enable Rosetta (Docker Desktop: Settings -> General -> enable "Use Rosetta for x86_64/amd64 emulation on Apple Silicon")

</Callout>

## Make

Visit the [Make Documentation](https://www.gnu.org/software/make/manual/make.html) for more info.


<Tabs groupId="language" items={['MacOS', 'Linux']} persist>

  <Tab value="MacOS">
    ```bash
    brew install make
    ```
  </Tab>

  <Tab value="Linux">
    ```bash
    sudo apt -y install make
    ```
  </Tab>

</Tabs>


## JQ

Visit the [JQ Documentation](https://jqlang.org/download/) for more info.

<Tabs groupId="language" items={['MacOS', 'Linux']} persist>

  <Tab value="MacOS">
    ```bash
    brew install jq
    ```
  </Tab>

  <Tab value="Linux">
    ```bash
    sudo apt -y install jq
    ```
  </Tab>

</Tabs>

## Node.js

Node v21+ is needed for the WAVS template. Visit the [NVM Installation guide](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) to install Node Version Manager and update your Node version.


After setting up your system, continue to the next page to create your project.
````

## File: docs/tutorial/3-project.mdx
````
---
title: 3. Create your project
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

1. After setting up your environment, open a terminal and run the following command to create your WAVS Foundry Template project. In this example, your project will be called `my-wavs`.

```bash
forge init --template Lay3rLabs/wavs-foundry-template my-wavs --branch 0.3
```

2. Then, enter your project:

```
cd my-wavs
```

3. Run the following command to open your project in VS code, or open it in the editor of your choice:

```bash
code .
```

## Explore the template

This template repo contains all the files you'll need to build, run, and test WAVS services locally.

The template already contains the necessary files for the oracle example to run. For example, the trigger ([`WavsTrigger.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsTrigger.sol)) and submission ([`WavsSubmit.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsSubmit.sol)) contracts can be found in the [`/my-wavs/src/contracts`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src) folder.

In [`/eth-price-oracle/src/lib.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs) you'll find the oracle service component.

This template uses a [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile) and environment variables to help with your developer experience. If you are ever curious about one of the `Make` commands in the following sections, you can always look at the [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile) to learn more.

<Callout title="Info" type="info">

You can run the following command from the root of the repo to see all of the commands and environment variable overrides available:

```bash
make help
```

</Callout>

The next sections will show you how to deploy your contracts and components, set up WAVS, and run the oracle example.


## Build and test your contracts

Run the following commands from the root of your project to install necessary dependencies, build the template contracts, and run tests using Forge.

```bash
# Install dependencies
make setup

# Build the contracts
forge build

# Run the solidity tests.
forge test
```

The last command runs a basic unit test which verifies that the `SimpleTrigger` contract in `/WavsTrigger.sol` correctly stores and retrieves trigger data.
````

## File: docs/tutorial/4-component.mdx
````
---
title: 4. Oracle component walkthrough
---
<!--docsignore
import { HoverContainer } from "@/components/hover-container";
import { Callout } from 'fumadocs-ui/components/callout';
import { Scrollycoding } from "@/components/scrollycoding";
import { link } from "@/components/link.tsx";
docsignore-->

The core logic of the price oracle in this example is located in the [`/eth-price-oracle/src/lib.rs` file](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs). Scroll down to follow a walkthrough of the code for the oracle component.


<HoverContainer>
<Scrollycoding>

## !!steps trigger.rs

The [trigger.rs](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/trigger.rs) file handles the decoding of incoming trigger data and preparing it for processing within the WAVS component. The `encode_trigger_output` function ensures that processed data is formatted correctly before being sent back. Update the code if you require different trigger types (e.g. Cosmos events) or if you are building a [custom trigger](./5-build#custom-triggers).


```rust ! trigger.rs
use crate::bindings::wavs::worker::layer_types::{TriggerData, TriggerDataEthContractEvent};
use alloy_sol_types::SolValue;
use anyhow::Result;
use wavs_wasi_chain::decode_event_log_data;

pub enum Destination {
    Ethereum,
    CliOutput,
}

pub fn decode_trigger_event(trigger_data: TriggerData) -> Result<(u64, Vec<u8>, Destination)> {
    match trigger_data {
        TriggerData::EthContractEvent(TriggerDataEthContractEvent { log, .. }) => {
            let event: solidity::NewTrigger = decode_event_log_data!(log)?;
            let trigger_info = solidity::TriggerInfo::abi_decode(&event._triggerInfo, false)?;
            Ok((trigger_info.triggerId, trigger_info.data.to_vec(), Destination::Ethereum))
        }
        TriggerData::Raw(data) => Ok((0, data.clone(), Destination::CliOutput)),
        _ => Err(anyhow::anyhow!("Unsupported trigger data type")),
    }
}

pub fn encode_trigger_output(trigger_id: u64, output: impl AsRef<[u8]>) -> Vec<u8> {
    solidity::DataWithId { triggerId: trigger_id, data: output.as_ref().to_vec().into() }
        .abi_encode()
}

mod solidity {
    use alloy_sol_macro::sol;
    pub use ITypes::*;

    sol!("../../src/interfaces/ITypes.sol");
}

```

## !!steps Oracle component definitions

The [`lib.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs) file contains the main component logic for the oracle. The first section of the code imports the required modules for requests, serialization, and bindings, defines the component struct, and exports the component for execution within the WAVS runtime.

```rust ! lib.rs
// !focus(1:13)
mod trigger;
use trigger::{decode_trigger_event, encode_trigger_output, Destination};
use wavs_wasi_chain::http::{fetch_json, http_request_get};
pub mod bindings;
use crate::bindings::{export, Guest, TriggerAction};
use serde::{Deserialize, Serialize};
use wstd::{http::HeaderValue, runtime::block_on};

struct Component;
export!(Component with_types_in bindings);

impl Guest for Component {
    fn run(action: TriggerAction) -> std::result::Result<Option<Vec<u8>>, String> {
        let (trigger_id, req, dest) =
            decode_trigger_event(action.data).map_err(|e| e.to_string())?;

        // Convert bytes to string and parse first char as u64
        let input = std::str::from_utf8(&req).map_err(|e| e.to_string())?;
        println!("input id: {}", input);

        let id = input.chars().next().ok_or("Empty input")?;
        let id = id.to_digit(16).ok_or("Invalid hex digit")? as u64;

        let res = block_on(async move {
            let resp_data = get_price_feed(id).await?;
            println!("resp_data: {:?}", resp_data);
            serde_json::to_vec(&resp_data).map_err(|e| e.to_string())
        })?;

        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}

async fn get_price_feed(id: u64) -> Result<PriceFeedData, String> {
    let url = format!(
        "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id={}&range=1h",
        id
    );

    let current_time = std::time::SystemTime::now().elapsed().unwrap().as_secs();

    let mut req = http_request_get(&url).map_err(|e| e.to_string())?;
    req.headers_mut().insert("Accept", HeaderValue::from_static("application/json"));
    req.headers_mut().insert("Content-Type", HeaderValue::from_static("application/json"));
    req.headers_mut()
        .insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"));
    req.headers_mut().insert(
        "Cookie",
        HeaderValue::from_str(&format!("myrandom_cookie={}", current_time)).unwrap(),
    );

    let json: Root = fetch_json(req).await.map_err(|e| e.to_string())?;

    Ok(PriceFeedData {
        symbol: json.data.symbol,
        price: json.data.statistics.price,
        timestamp: json.status.timestamp,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceFeedData {
    symbol: String,
    timestamp: String,
    price: f64,
}

/// -----
/// <https://transform.tools/json-to-rust-serde>
/// Generated from <https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id=1&range=1h>
/// -----
///
#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub data: Data,
    pub status: Status,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Data {
    pub id: f64,
    pub name: String,
    pub symbol: String,
    pub statistics: Statistics,
    pub description: String,
    pub category: String,
    pub slug: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Statistics {
    pub price: f64,
    #[serde(rename = "totalSupply")]
    pub total_supply: f64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CoinBitesVideo {
    pub id: String,
    pub category: String,
    #[serde(rename = "videoUrl")]
    pub video_url: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "previewImage")]
    pub preview_image: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Status {
    pub timestamp: String,
    pub error_code: String,
    pub error_message: String,
    pub elapsed: String,
    pub credit_count: f64,
}
```

## !!steps Trigger data

The next section decodes the event sent from the trigger and extracts the `trigger_id` and data. The `run` function in `lib.rs` calls `decode_trigger_event` from `trigger.rs` to parse the trigger input, retrieve the trigger ID, and process the data by converting it into an asset ID, which will be used in the query.

```rust ! lib.rs
mod trigger;
use trigger::{decode_trigger_event, encode_trigger_output, Destination};
use wavs_wasi_chain::http::{fetch_json, http_request_get};
pub mod bindings;
use crate::bindings::{export, Guest, TriggerAction};
use serde::{Deserialize, Serialize};
use wstd::{http::HeaderValue, runtime::block_on};

struct Component;
export!(Component with_types_in bindings);

// !focus(1:11)
impl Guest for Component {
    fn run(action: TriggerAction) -> std::result::Result<Option<Vec<u8>>, String> {
        let (trigger_id, req, dest) =
            decode_trigger_event(action.data).map_err(|e| e.to_string())?;

        // Convert bytes to string and parse first char as u64
        let input = std::str::from_utf8(&req).map_err(|e| e.to_string())?;
        println!("input id: {}", input);

        let id = input.chars().next().ok_or("Empty input")?;
        let id = id.to_digit(16).ok_or("Invalid hex digit")? as u64;

        let res = block_on(async move {
            let resp_data = get_price_feed(id).await?;
            println!("resp_data: {:?}", resp_data);
            serde_json::to_vec(&resp_data).map_err(|e| e.to_string())
        })?;

        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}
```

## !!steps Fetching price data

Then, `get_price_feed(id).await` is called to fetch the asset price from CoinMarketCap.

```rust ! lib.rs
        // Convert bytes to string and parse first char as u64
        let input = std::str::from_utf8(&req).map_err(|e| e.to_string())?;
        println!("input id: {}", input);

        let id = input.chars().next().ok_or("Empty input")?;
        let id = id.to_digit(16).ok_or("Invalid hex digit")? as u64;

// !focus(1:4)
        let res = block_on(async move {
            let resp_data = get_price_feed(id).await?;
            println!("resp_data: {:?}", resp_data);
            serde_json::to_vec(&resp_data).map_err(|e| e.to_string())
        })?;


        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}
```


## !!steps Price feed data

The asset ID passed from the trigger is used in the API request to fetch the data from CoinMarketCap.

The returned price data is then extracted from the response and converted into a structured format.

```rust ! lib.rs
        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}
// !focus(1:18)
async fn get_price_feed(id: u64) -> Result<PriceFeedData, String> {
    let url = format!(
        "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id={}&range=1h",
        id
    );

    let current_time = std::time::SystemTime::now().elapsed().unwrap().as_secs();

    let mut req = http_request_get(&url).map_err(|e| e.to_string())?;
    req.headers_mut().insert("Accept", HeaderValue::from_static("application/json"));
    req.headers_mut().insert("Content-Type", HeaderValue::from_static("application/json"));
    req.headers_mut()
        .insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"));
    req.headers_mut().insert(
        "Cookie",
        HeaderValue::from_str(&format!("myrandom_cookie={}", current_time)).unwrap(),
    );

    let json: Root = fetch_json(req).await.map_err(|e| e.to_string())?;

    Ok(PriceFeedData {
        symbol: json.data.symbol,
        price: json.data.statistics.price,
        timestamp: json.status.timestamp,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceFeedData {
    symbol: String,
    timestamp: String,
    price: f64,
}
```

## !!steps Handling the Response

The price data is ready to be passed to the submission contract (also known as the Service Handler), which will verify that the response was sent by an operator before submitting on-chain.

```rust ! lib.rs


// !focus(1:5)
        let output = match dest {
            Destination::Ethereum => Some(encode_trigger_output(trigger_id, &res)),
            Destination::CliOutput => Some(res),
        };
        Ok(output)
    }
}
```

## !!steps Logging for development

<p id="logging"> </p>

When developing your own WASI component, it's helpful to use logging methods in your code. Components write all their standard output and errors (`stdout` or `stderr`) to the host machine.

In this example, `println!()` is used in `fn run()` to debug `input id` and `resp_data` while processing price feed requests asynchronously. This will write to `stdout` and is visible in local development when you run the [`wasi-exec` command](./5-build#testing-and-debugging) in the next section of this guide.

For production, you can use a `host::log()` function which takes a `LogLevel` and writes its output via the tracing mechanism. Along with the string that the developer provides, it attaches additional context such as the `ServiceID`, `WorkflowID`, and component `Digest`.

```rust ! lib.rs
impl Guest for Component {
    fn run(action: TriggerAction) -> std::result::Result<Option<Vec<u8>>, String> {
        let (trigger_id, req, dest) =
            decode_trigger_event(action.data).map_err(|e| e.to_string())?;

        // Convert bytes to string and parse first char as u64
        let input = std::str::from_utf8(&req).map_err(|e| e.to_string())?;
        // !focus(1)
        println!("input id: {}", input);

        let id = input.chars().next().ok_or("Empty input")?;
        let id = id.to_digit(16).ok_or("Invalid hex digit")? as u64;

        let res = block_on(async move {
            let resp_data = get_price_feed(id).await?;
             // !focus(1)
            println!("resp_data: {:?}", resp_data);

            serde_json::to_vec(&resp_data).map_err(|e| e.to_string())
        })?;
```



## !!steps Next steps

Continue to the [next section](./5-build) to learn how to build and test your component.

```rust ! lib.rs
⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠇⡅⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠧⡇⠀⠀⠒⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⡤⡆⠦⠆⢀⠠⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠧⣷⣆⠅⢦⠀⠀⠀⠀⠀⠀⠀⠀⠠⠀⠈⠀⠀⠀⠀⠀⢤⣤⣆⢇⣶⣤⡤⡯⣦⣌⡡⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠷⣿⣷⣆⣐⡆⠀⠀⠀⠀⢀⠤⠊⠀⠀⢀⣠⣾⢯⣦⣴⣜⣺⣾⣿⣤⠟⠋⣷⢛⡣⠭⠢⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠯⣿⣷⢫⡯⠄⠀⠀⢀⠐⠁⠀⠀⠀⠠⣤⣿⣿⣾⣿⣿⣿⣿⣿⣿⣿⣿⣙⣷⡗⢤⡤⠀⠈⣰⠶⡤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣩⣿⡏⠉⠉⠀⢠⡔⠁⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠑⣏⠶⡉⠖⣡⠂⣈⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣮⣿⣧⣤⣤⠖⠁⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⢉⡻⣿⣿⣿⣿⣿⣿⣿⣿⠟⠓⠈⠅⠈⠀⠀⠘⢒⣽⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⣿⡿⠛⠉⠀⠀⠀⣀⠔⢀⡴⣃⠀⠀⢀⠷⠲⡄⠸⠟⢋⣿⣿⣿⣿⣿⡇⠀⠀⠀⠐⠁⠀⠀⠂⠀⠀⠰⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⡆⣷⣆⡐⠶⠤⢤⣷⣀⣀⣩⢐⣟⣥⠜⣤⣀⣠⣤⠀⠈⠉⢀⣹⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢃⣿⣞⣫⡔⢆⡸⡿⣿⣿⣄⣰⣿⠁⢀⣛⠿⣻⣿⣿⣧⣬⣿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⢀
⢼⣿⣟⢿⣧⣾⣵⣷⣿⣿⣟⡿⢿⣶⣞⣍⡴⢿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⣠⠈⠀⢀⣀⣼
⠋⣿⣟⡛⢿⣿⣿⣿⣿⣿⣭⣿⣿⣿⣿⣯⣽⣿⣿⣿⣿⠟⠛⠿⢽⣿⣿⣆⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⣀⢀⡠⣤⣤⣰⣿⠟⠁⠀⠀⡼⢾⣿
⣻⣿⣟⣇⠈⣉⣯⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠃⠀⠀⠀⠀⠀⠻⣿⣿⣿⣿⣴⣶⣤⣤⣤⣤⣴⣴⣴⣶⣦⣦⣤⣦⣀⣦⣤⣶⣿⣿⣿⣿⣿⣿⣿⠿⠁⠀⠀⡀⣤⣬⣾⣿
⡝⣿⣿⣇⣤⣶⣿⣷⣾⣭⡿⠻⢿⣿⣿⣿⣿⠿⠃⠀⠀⠀⠀⡄⠀⠀⠀⢊⡻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⢿⠟⢉⠀⡀⢤⣴⣿⣿⣿⠿⠻
⡁⣻⣿⣿⣿⣿⣷⣿⣿⣿⣿⠾⣿⡿⠞⠁⠀⠀⠀⠀⠀⠔⠫⡅⠀⠀⠀⠀⠁⣀⠀⠈⠻⣿⣿⣿⣿⣻⢟⣁⣄⡄⣀⠙⠻⣿⣿⡿⠿⠛⡋⠕⠂⢀⣀⣄⣓⣳⢿⠟⢛⣩⠴⠈⠀
⠂⡁⠈⠛⠛⠛⠛⠋⠁⠀⠈⠈⡀⠀⠀⠀⠀⢀⠘⠀⠀⠀⠆⠀⡀⡢⣀⣆⠄⠈⠨⢦⡀⣈⠙⠛⠿⢿⣿⣿⣿⣿⣿⡿⡿⠿⠟⠆⠒⠁⠀⢶⣾⠿⠟⠛⢉⣀⣠⡶⠚⠁⠀⠀⣠
⠀⡇⡄⣀⡀⠀⠀⠀⠀⠀⠀⠀⢬⠠⠀⡀⠀⠋⠁⠀⡀⠀⠀⡀⠆⢱⣿⣿⣧⣧⣄⠛⣿⣞⣵⣤⣷⣄⠀⠀⠀⠐⠀⠀⠀⠀⠀⠈⠉⠁⠁⠀⠠⢤⣶⣾⣿⡿⠋⢀⣀⣰⣶⣾⣿
⡀⡆⠀⡉⡁⢿⣉⢀⠀⣰⣷⣿⣟⠠⡽⢂⡀⡄⠀⠰⣖⢱⢖⢂⡆⠈⣿⣿⣿⣿⣿⣶⣄⡙⠻⢿⣿⣿⣷⣦⣀⠀⠠⣤⣀⡀⢈⣓⣶⣶⣿⣿⣿⣿⣿⠟⠉⠀⠀⠀⣉⣭⣽⣿⣿
⡇⣯⣿⣿⣿⣾⣿⣿⣿⠿⠟⡡⢞⣹⠾⢻⣚⣛⢺⠞⢋⣭⣾⣧⡃⢄⡈⢿⣿⣿⣿⣿⣿⣿⣯⣿⣮⣽⣿⣿⣿⣿⣷⣬⣽⣿⣿⣿⣽⡿⣿⡿⠟⠋⢀⣀⣐⣺⣿⣿⣟⣫⣭⣿⣿
⢳⣿⣿⣿⣿⣿⣿⣿⣿⣤⣿⣿⣿⣿⣿⣦⠒⠉⢁⡀⠀⣙⣛⢿⣷⣶⣅⠀⠙⠻⣿⣿⣿⣿⣟⡚⠛⠻⠞⠿⠿⡿⡿⠯⠁⠟⣊⠾⠝⢋⣁⣀⣤⣤⣿⣿⣿⡿⠿⠿⠻⠛⠻⠻⠿
⣸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣐⣾⡿⡟⢶⠾⢋⢹⠿⢿⣿⣿⣷⣦⡈⠙⠛⠿⠿⢿⣶⣶⣶⣶⣶⢶⠟⠚⠀⠁⠀⠀⠙⠛⠛⠛⠛⠛⠋⠉⠁⠀⠀⠀⠀⠀⢀⠀⠀
```

</Scrollycoding>
</HoverContainer>
````

## File: docs/tutorial/5-build.mdx
````
---
title: 5. Build and test components
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

<Callout title="Before proceeding" type="warn">

{/* This section is also in [](./2-setup.mdx). Remember to update there as well */}

1. Make sure that Docker is installed. If you are using Docker Desktop, make sure it is open and running. If you are using Mac OS, make sure that your[ Docker app is configured correctly](./2-setup#docker).

2. Make sure that you have already run the following commands from the [system setup section](./2-setup#cargo-components).

```bash
cargo install cargo-binstall
cargo binstall cargo-component warg-cli wkg --locked --no-confirm --force

# Configure default registry
wkg config --default-registry wa.dev
```


</Callout>

## Build WASI component

Run the following command in your terminal to build your component.

```bash
make wasi-build
```

This command will build any components present in the `/components` directory, as well as auto-generate bindings and compile the components to WASM. The output will be placed in the `compiled` directory.

<Callout title="Build command" type="info">
You can also use the command below to build your solidity contracts and components in one command:

```bash
make build
```

</Callout>

## Testing and debugging

You can use the following command to test the WASM component locally. This command is handy for testing components without having to deploy WAVS.

An ID of 1 is Bitcoin. Nothing will be saved on-chain, just the output of the component is shown.


```bash
COIN_MARKET_CAP_ID=1 make wasi-exec
```

This command runs your component locally in a simulated environment and lets you easily view `print` statements for debugging.

`COIN_MARKET_CAP_ID` is the ID of the asset to fetch the price for. This input is formatted as a `bytes32` string using `cast format-bytes32-string` before being passed to the component.

Running this command in the oracle example will run the component, fetch the price of Bitcoin, and print the result. Visit the [component walkthrough](./4-component#logging) for more information on logging during testing and production.


Upon successful execution, you should receive a result similar to the following:

```bash
resp_data: Ok(PriceFeedData { symbol: "BTC", timestamp: "2025-02-14T01:23:03.963Z", price: 96761.74120116462 })
 INFO Fuel used:
1477653

Result (hex encoded):
7b2273796d626f6c223a22425443222c2274696d657374616d70223a22323032352d30322d31345430313a32333a30332e3936335a222c227072696365223a39363736312e37343132303131363436327d

Result (utf8):
{"symbol":"BTC","timestamp":"2025-02-14T01:23:03.963Z","price":96761.74120116462}
```

<Callout title="Fuel" type="info">

In the output above, the `INFO Fuel used` value represents the computational power consumed during execution. Similar to how on-chain transactions have a gas limit to cap transaction costs, WAVS enforces a fuel limit to control off-chain computational workload and protect against DoS attacks.

The maximum fuel allocation can be adjusted in the `Makefile` to accommodate different processing needs.

</Callout>


## Custom triggers

When developing a custom trigger, you will need to update the template code in a few places:

1. The trigger contract itself in [`src/WavsTrigger.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsTrigger.sol), which defines how triggers are created and emitted on-chain.
2. The `wasi-exec` command in the [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile#L39-L43), which passes input data when testing WAVS components via ``--input `cast format-bytes32-string $(COIN_MARKET_CAP_ID)` ``. This simulates an Ethereum event during local execution.
3. The `decode_trigger_event` function in [`/components/eth-price-oracle/src/trigger.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/trigger.rs#L11-L21), which processes the trigger data and extracts relevant fields like `trigger_id` and `data`.
4. The `run` function in [`/components/eth-price-oracle/src/lib.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs#L13), which calls decode_trigger_event, processes the extracted trigger data, and determines how to handle it.
5. The trigger script in [`/script/Trigger.s.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/script/Trigger.s.sol#L15), which calls the `addTrigger` function with the `coinMarketCapID`, used in this template for the oracle example.

##  Contract interfaces

You can view the code for the Solidity interfaces on the WAVS NPM package site: https://www.npmjs.com/package/@wavs/solidity?activeTab=code
````

## File: docs/tutorial/6-run-service.mdx
````
---
title: 6. Run your service
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

## Start Anvil, WAVS, and Deploy Eigenlayer

1. Create a `.env` file for your project by copying over the example with the following command:

```bash
cp .env.example .env
```

2. Use the following command to start an Anvil test chain and the WAVS runtime while deploying core EigenLayer contracts for your service:

```bash
make start-all
```

<Callout title="Keep WAVS running" type="info">

The `start-all` command must remain running in your terminal. Open another terminal to run other commands.

You can stop the services with `ctrl+c`. Some MacOS terminals require pressing this twice.

</Callout>


With the chain and WAVS running, you can deploy and run your service.

## Deploy solidity contracts

Open a new terminal and run the following command from the root of your project to upload your Service's Trigger and Submission contracts:

```bash
export SERVICE_MANAGER_ADDR=`make get-eigen-service-manager-from-deploy`
forge script ./script/Deploy.s.sol ${SERVICE_MANAGER_ADDR} --sig "run(string)" --rpc-url http://localhost:8545 --broadcast
```

## Deploy your service to WAVS

The following command will deploy your WASI component and service information to WAVS to be run by operators when triggered:

```bash
make deploy-service
```

This command specifies the event emitted from your trigger contract as the on-chain event that will trigger your service. In the [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile#L95-L102), you can also see that it specifies the submission contract as the `submit-address`, as well as the filename of your component.

<Callout title="Customize variables" type="info">

Open the [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile#L9-L22) to view the different variables that you can customize, including the trigger event, the component filename, and the service config.

You can also modify variables by specifying them before running the `make` command:

```bash
TRIGGER_EVENT="NewTrigger(bytes)" make deploy-service
```

</Callout>


## Trigger the Service

Next, use your deployed trigger contract to trigger the oracle to be run. In the following command, you'll specify the `COIN_MARKET_CAP_ID` as `1`, which corresponds to the ID of Bitcoin.

Running this command will execute [`/script/Trigger.s.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/script/Trigger.s.sol) and pass the ID to the trigger contract, starting the following chain of events:

1. The trigger contract will emit an event with the specified ID as its data.
2. Operators listening for the event will receive the data and run it in the oracle component off-chain.
3. The oracle component will use the ID to query the price of Bitcoin from the CoinMarketCap API.
4. The returned data will be signed by operators and passed to the submission contract, which will verify the operator's signature and submit the price of Bitcoin on-chain 🎉


```bash
export COIN_MARKET_CAP_ID=1
export SERVICE_TRIGGER_ADDR=`make get-trigger-from-deploy`
forge script ./script/Trigger.s.sol ${SERVICE_TRIGGER_ADDR} ${COIN_MARKET_CAP_ID} --sig "run(string,string)" --rpc-url http://localhost:8545 --broadcast -v 4
```

## Show the result

Run the following to view the result of your service in your terminal:

```bash
# Get the latest TriggerId and show the result via `script/ShowResult.s.sol`
make show-result
```

Congratulations, you've just made a simple Bitcoin price oracle service using WAVS!
````

## File: docs/tutorial/7-prediction.mdx
````
---
title: 7. Prediction market
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

Now that you've built a simple oracle service, take a look at the [WAVS Demo Repo](https://github.com/Lay3rLabs/wavs-demos/blob/main/demos/PREDICTION_MARKET_DEMO.md) to see a similar component used in action to resolve a prediction market.

This page will give an overview of the prediction market demo, how it works, and how the oracle component is used to resolve markets.

Prediction market demo repo: https://github.com/Lay3rLabs/wavs-demos/tree/main

## What is a prediction market?

A prediction market is a marketplace that gathers insights about the future by rewarding participants for making accurate predictions based on available information. For example, a prediction market could be created for whether it will snow in Oslo on November 5th. Users can create positions by depositing money based on two outcomes: yes or no. After the event transpires, an oracle service can be used to bring in the weather outcome, resolving the market and rewarding those who predicted correctly.

## How does it work?

### Market Solidity Contracts

These contracts handle the creation of markets and conditional tokens.

[`conditional-tokens-contracts`](https://github.com/Lay3rLabs/conditional-tokens-contracts) - these contracts are forked from Gnosis and updated to a recent Solidity version, and they are the core protocol that creates a conditional share in a future outcome.

[`conditional-tokens-market-makers`](https://github.com/Lay3rLabs/conditional-tokens-market-makers) - these contracts are forked from Gnosis and updated to a recent Solidity version, and they are the market makers that create a market based on the conditional shares above.

[`PredictionMarketFactory.sol`](https://github.com/Lay3rLabs/wavs-demos/blob/d13fd90b1407cdb876340e2f399769bb31b1dc52/src/PredictionMarketFactory.sol) - this contract sets up all the contracts required for a functioning prediction market using the forked contracts above, and it has the power to resolve the market once the outcome is determined by the oracle AVS.

### Extending the trigger contract

In this demo, the oracle that resolves the market is triggered by the [`PredictionMarketOracleController.sol`](https://github.com/Lay3rLabs/wavs-demos/blob/d13fd90b1407cdb876340e2f399769bb31b1dc52/src/PredictionMarketOracleController.sol) contract.

This contract contains modifications to the `WavsTrigger.sol` contract from the [WAVS Foundry Template repo](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsTrigger.sol). Similar to the simple trigger contract, it passes data to the oracle AVS via the `NewTrigger` event.

```rust
    struct TriggerInputData {
        address lmsrMarketMaker;
        address conditionalTokens;
        bool result;
    }
```

In addition, it also contains logic to handle responses from the oracle service.

```rust
    struct AvsOutputData {
        address lmsrMarketMaker;
        address conditionalTokens;
        bool result;
    }
```

It extends the contract by storing trigger metadata, validating signed AVS outputs, and interacting with the external contracts mentioned above (`PredictionMarketFactory`, `MarketMaker`, and `ConditionalTokens`).

It also contains logic to enforce a payment when a trigger is added:

```rust
function addTrigger(
        TriggerInputData calldata triggerData
    ) external payable returns (ITypes.TriggerId triggerId) {
        require(msg.value == 0.1 ether, "Payment must be exactly 0.1 ETH");
```

Take a look at the [`PredictionMarketOracleController.sol`](https://github.com/Lay3rLabs/wavs-demos/blob/d13fd90b1407cdb876340e2f399769bb31b1dc52/src/PredictionMarketOracleController.sol) file to get an idea of how the contract is structured.

This contract is responsible for interacting with the oracle service, triggering WAVS to run the oracle, waiting for the oracle's response, and telling the market factory to resolve the market.

### Oracle WASI Component

Similar to the oracle you created in the tutorial, the prediction market uses a simple oracle service to resolve a market by bringing off-chain data on-chain.

This WASI component runs in WAVS and fetches the prediction market's resolution when necessary. A wallet executes the [`PredictionMarketOracleController.sol`](https://github.com/Lay3rLabs/wavs-demos/blob/d13fd90b1407cdb876340e2f399769bb31b1dc52/src/PredictionMarketOracleController.sol#L83) contract's `addTrigger` function, which triggers WAVS to run this oracle by emitting an event. Then, WAVS commits the response from this oracle component with a signature back to the contract on-chain, and the market is resolved.

Performing this market resolution via WAVS means prediction markets can exist in a fully decentralized manner. Because money is on the line, entrusting any party to honestly resolve the market is a critical security decision—WAVS enables distributing this trust over multiple independent parties, taking advantage of the verifiability and security of the existing WAVS infrastructure instead of relying on any centralized individual.

## Try it out

You can run the prediction market demo locally by following the steps from the [README](https://github.com/Lay3rLabs/wavs-demos/blob/main/demos/PREDICTION_MARKET_DEMO.md).

Follow along in the video tutorial to see how to run the prediction market demo locally:



   <div style={{display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "2em"}}>
     <iframe width="560" height="315" src="https://www.youtube.com/embed/BT0CjXCJhbY" title="WAVS Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
   </div>
````

## File: docs/benefits.mdx
````
---
title: WAVS benefits
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/banners/benefits.png" />

>WAVS is a platform that makes building AVSs easier.

**The problem**: creating an AVS the traditional way is complicated. It requires a lot of preliminary development work, such as building custom contracts, scaffolding infrastructure, working with Dockerized components, and coordinating with operators. Most of the development centers around creating AVS infrastructure, which is generally more complicated than the core logic of the service itself.

**There is an easier way**: WAVS provides a base layer of AVS infrastructure so you can focus solely on creating the core logic of your service. This logic is written in Rust (with other languages available soon) and compiled as a lightweight WASI component which can be deployed to the WAVS platform and run as an AVS by operators. These components are run off-chain by operators in the WAVS (WASI-AVS) runtime at near-native speed, and the results are brought verifiably on-chain. A service of services, WAVS allows an AVS to dynamically run and manage multiple components that work together to build flexible and intelligent applications.

## Why WAVS?

WAVS redefines the AVS paradigm, making AVSs easier to build, less expensive to run, and enabling the next generation of composable, intelligent blockchain protocols.

1. Dynamic and Cost-Effective Service Management
    - Flexibility: Add, update, or manage components dynamically without having to coordinate upgrades with an entire operator set.
    - Cost-effective and performant: Multiple AVSs run on the WAVS runtime
        - WASI service components are lightweight compared to Docker, saving storage and startup time.
        - WASI components have instantaneous initialization vs. Docker's redundant OS layers and slower boot times.
2. Simplified Development
    - Focus on your application logic, not overhead:
        - With templates, there’s no need to write multiple custom contracts to parse events or aggregate signatures.
        - WAVS handles common AVS infrastructure, leaving AVS developers to focus on their core logic.
3. Multichain Ready
    - WAVS is built to operate across multiple blockchain environments and will be released with support for EVM networks.
    - WAVS will foster a multichain ecosystem for AVSs to interact and interoperate.
4. Intelligent Protocols & Composability
    - Enable asynchronous, verifiable execution flows across multiple on and off-chain components.
    - Compose multiple services to create dynamic intelligent protocols that surpass the limitations of traditional smart contracts.
````

## File: docs/custom-components.mdx
````
---
title: Custom Component Handbook
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { DocsPage } from 'fumadocs-ui/page';
docsignore-->

<Callout title="Follow the tutorial" type="info">

Before reading this guide, follow the [Oracle component tutorial](/tutorial/1-overview) to learn the basics of building a WAVS service.

</Callout>

Use the info in this guide to customize the template to create your own custom service. Check out the [WAVS design considerations](/design) page to learn which use-cases WAVS is best suited for.

## Foundry Template structure

The foundry template is made up of the following main files:

```bash
wavs-foundry-template/
├── README.md
├── makefile               # Commands, variables, and configs
├── components/            # WASI components
│   └── eth-price-oracle/
│       ├── Cargo.toml     # Component dependencies
│       ├── lib.rs         # Main Component logic
│       ├── trigger.rs     # Trigger handling
│       └── bindings.rs    # Bindings generated by `make build`
├── compiled/              # WASM files compiled by `make build`
├── src/
│   ├── contracts/        # Trigger and submission contracts
│   └── interfaces/       # Solidity interfaces
├── script/               # Scripts used in makefile commands
├── cli.toml              # CLI configuration
├── wavs.toml             # WAVS service configuration
├── docs/                 # Documentation
└── .env                  # Private environment variables
```

- The `README` file contains the tutorial commands.
- The `makefile` contains commands for building and deploying the service. It also contains variables and configs for the service.
- The components directory contains the component logic for your service. Running `make wasi-build` will automatically generate bindings and compile components into the `compiled` directory.
- The src directory contains the Solidity contract and interfaces.
- The script directory contains the scripts used in the makefile commands to deploy, trigger, and test the service.
- The `.env` file contains private environment variables and keys. Use `cp .env.example .env` to copy the example `.env` file.

## WAVS services

The basic service is made up of a trigger, a component, and submission logic (optional).

[Trigger](#triggers): any onchain event emitted from a contract.

[Component](#components): the main logic of a WAVS service. Components are responsible for processing the trigger data and executing the business logic.

[Submission](#submission): handles the logic for submitting a component's output to the blockchain.

## Triggers

A trigger prompts a WAVS service to run. Operators listen for the trigger event specified by the service and execute the corresponding component off-chain. Triggers can be any onchain event emitted from any contract.

### Trigger lifecycle

1. When a service is deployed, it is configured with a trigger address and event, a wasi component, and a submission contract (optional).

2. Registered operators listen to chain logs. Each operator maintains lookup maps and verifies events against registered triggers.

3. When a trigger event is emitted, operators pick up the event and verify the event matches the registered trigger.

4. If a match is found, WAVS creates a `TriggerAction` that wraps the trigger event data:

```rust
TriggerAction {
    // Service and workflow identification
    config: TriggerConfig {
       service_id: ServiceID,      // Generated during deployment
        workflow_id: WorkflowID,    // Default or specified
        trigger: Trigger::EthContractEvent {
           address: Address,       // Contract address
            chain_name: ChainName,  // Chain identifier
            event_hash: ByteArray<32> // Event signature
        }
    },
   // The actual event data
    data: TriggerData::EthContractEvent {
        contract_address: Address,  // Emitting contract
        chain_name: ChainName,      // Source chain
        log: LogData {             // Raw event data
            topics: Vec<Vec<u8>>,  // Event signature + indexed params
            data: Vec<u8>         // ABI-encoded event data
        },
        block_height: u64         // Block number
    }
}
```

5. The TriggerAction is converted to a WASI-compatible format and passed to the component where it is decoded and processed.

### Developing triggers

WAVS doesn't interpret the contents of event triggers. Instead, it passes the raw log data to components, which can decode and process the data according to their specific needs.

To configure a trigger for a service, you'll need to specify:

- The event signature/name that identifies which specific event should trigger the service. This can either be a hex-encoded event signature or an event name.
- The contract address where the event will be emitted from.

In the template, the trigger event is set in the `Makefile` as `TRIGGER_EVENT ?= NewTrigger(bytes)` and the trigger address of the example trigger contract is automatically populated during deployment. To change the trigger event or address, you can manually [update the `Makefile` variables](#customizing-makefile-variables) and redeploy the service.

When a WAVS component receives this trigger, it uses the `decode_event_log_data!` macro from the [`wavs-wasi-chain`](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/all.html#functions) crate to decode the event data for processing.

The [trigger contract in the WAVS foundry template](https://github.com/Lay3rLabs/wavs-foundry-template/blob/v0.3.0/src/contracts/WavsTrigger.sol) is a simple example that takes generic bytes and passes them to the component. The flow for triggers is located in several places in the template:

- The trigger contract in [`src/WavsTrigger.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsTrigger.sol) defines how triggers are created and emitted on-chain.
- The trigger script in [`/script/Trigger.s.sol`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/script/Trigger.s.sol#L15) calls the `addTrigger` function with the `coinMarketCapID`.
- The `decode_trigger_event` function in [`/components/eth-price-oracle/src/trigger.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/trigger.rs#L11-L21) processes the trigger data and extracts the `trigger_id` and `data`.
- The `run` function in [`/components/eth-price-oracle/src/lib.rs`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/components/eth-price-oracle/src/lib.rs#L13) calls `decode_trigger_event`, processes the extracted trigger data, and determines how to handle it.
- When testing, the `wasi-exec` command in the [`Makefile`](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/Makefile#L39-L43) passes input data when testing WAVS components via ``--input `cast format-bytes32-string $(COIN_MARKET_CAP_ID)` ``. This uses cast to format the `COIN_MARKET_CAP_ID` as a bytes32 string and simulates an Ethereum event during local execution.

## Components

WASI components contain the main logic of a WAVS service. They are responsible for processing the trigger data and executing the business logic of a service.

A basic component has three main parts:

- Decoding incoming trigger data.
- Processing the data (this is the custom logic of your component).
- Encoding and returning the result for submission (if applicable).

After being passed the `TriggerAction`, the component decodes it using the `decode_event_log_data!` macro from the [`wavs-wasi-chain`](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/all.html#functions) crate.

```rust

#[allow(warnings)]
mod bindings;
use alloy_sol_types::{sol, SolValue};
use bindings::{export, wavs::worker::layer_types::{TriggerData, TriggerDataEthContractEvent}, Guest, TriggerAction};
use wavs_wasi_chain::decode_event_log_data;

// Solidity types for the incoming trigger event using the `sol!` macro
sol! {
    event MyEvent(uint64 indexed triggerId, bytes data);
    struct MyResult {
        uint64 triggerId;
        bool success;
    }
}

// Define the component
struct Component;
export!(Component with_types_in bindings);

impl Guest for Component {
    fn run(action: TriggerAction) -> Result<Option<Vec<u8>>, String> {
        match action.data {
            TriggerData::EthContractEvent(TriggerDataEthContractEvent { log, .. }) => {
                // 1. Decode the event
                let event: MyEvent = decode_event_log_data!(log)
                    .map_err(|e| format!("Failed to decode event: {}", e))?;
                
                // 2. Process data (your business logic goes here)
                let result = MyResult {
                    triggerId,
                    success: true
                };
                
                // 3. Return encoded result
                Ok(Some(result.abi_encode()))
            }
            _ => Err("Unsupported trigger type".to_string())
        }
    }
}
```

Components must implement the `Guest` trait, which is the main interface between your component and the WAVS runtime. The `run` function is the entry point for processing triggers: it should receive the trigger data, decode it, process it according to your component's logic, and return the results. If you need to submit results to the blockchain, results need to be encoded using `abi_encode()`.

The `sol!` macro from `alloy_sol_types` is used to define Solidity types in Rust. It generates Rust structs and implementations that match your Solidity types, including ABI encoding/decoding methods.

Bindings are automatically generated for any files in the `/components` and `/src` directories when the `make build` command is run.

## Submission

A service handler or submission contract handles the logic for submitting a component's output to the blockchain. A submission contract must implement the `handleSignedData()` function using the `IWavsServiceHandler` interface. This interface is defined in the `@wavs` package: https://www.npmjs.com/package/@wavs/solidity?activeTab=code

In the template, the [submission contract](https://github.com/Lay3rLabs/wavs-foundry-template/tree/v0.3.0/src/contracts/WavsSubmit.sol) uses the `handleSignedData()` function to validate the operator's signature and store the processed data from the component. The `DataWithId` struct must match the output format from the component. Each trigger has a unique ID that links the data to its source.

Template submission example:

```solidity
function handleSignedData(bytes calldata _data, bytes calldata _signature) external {
    // 1. Validate the operator's signature by calling the `validate` function on the `_serviceManager` contract
    _serviceManager.validate(_data, _signature);

    // 2. Decode the data into a DataWithId struct defined in the `ITypes` interface
    DataWithId memory dataWithId = abi.decode(_data, (DataWithId));

    // 3. Store the result in state
    _signatures[dataWithId.triggerId] = _signature;      // 1. Store operator signature
    _datas[dataWithId.triggerId] = dataWithId.data;      // 2. Store the data
    _validTriggers[dataWithId.triggerId] = true;         // 3. Mark trigger as valid
}
```

Note: submission contracts are not required for a WAVS service. If you don't need to submit data back to the blockchain, you can modify the makefile `deploy-service` command to use the `--submit none` flag when deploying the service:

```bash
deploy-service:
	@$(WAVS_CMD) deploy-service --log-level=info --data /data/.docker --home /data \
	--component "/data/compiled/${COMPONENT_FILENAME}" \
	--trigger-event-name "${TRIGGER_EVENT}" \
	--trigger-address "${SERVICE_TRIGGER_ADDR}" \
	--service-config ${SERVICE_CONFIG} \
  --submit none
```

## Makefile commands

The makefile contains several commands for building, testing, and deploying WAVS components. Here's a detailed explanation of the most commonly used commands:

#### Building and Testing Components

1. Build your WASI components

```bash
make wasi-build
```
**Under the hood**:
  - Iterates over all components found in the `components` directory.
  - Automatically generates WASI bindings for each component.
  - Runs `cargo component build --release` to compile the components.
  - Formats the code using `cargo fmt`.
  - Copies the compiled `.wasm` files to the `compiled` directory.

2. Test your WASI components directly without deploying to a chain.

```bash
COIN_MARKET_CAP_ID=1 make wasi-exec
```

**Under the hood**:
  - Uses the `wavs-cli` Docker image to run the component specified by `COMPONENT_FILENAME`.
  - Simulates the trigger event using the `COIN_MARKET_CAP_ID` as the input and the `SERVICE_CONFIG` to configure the service.
  - Executes the component with the input data.
  - Can handle input data in three formats:
    - `@file`: Reads input from a file
    - `0x`: Treats input as hex-encoded bytes
    - Raw string: Treats input as raw bytes (you may need to format the input data appropriately before passing it to the component)
  - For the `ETH_PRICE_ORACLE` component, the input data must be formatted into a `bytes32` string. This is done in the makefile's `wasi-exec` command using ``--input `cast format-bytes32-string $(COIN_MARKET_CAP_ID)```. When creating your own components, update the makefile to use the appropriate format for your use case.

**Variables**:
  - `COMPONENT_FILENAME`: The path of the compiled WASM file to execute.
  - `COIN_MARKET_CAP_ID`: The input data used to simulate the trigger event.
  - `SERVICE_CONFIG`: The service configuration for the component containing the `host_envs` and `kv` variables.

#### Setup

```bash
make setup
```
- **Purpose**: Installs initial dependencies required for the project.
- **Under the hood**:
  - Checks for system requirements like Node.js, jq, and cargo.
  - Installs dependencies using `forge install` and `npm install`.

```bash
forge build
```
- **Purpose**: Builds the Solidity contracts.
- **Under the hood**:
  - Compiles the Solidity contracts using Foundry's `forge` tool.

```bash
forge test
```
- **Purpose**: Runs tests for the Solidity contracts.
- **Under the hood**:
  - Executes the test suite using Foundry's `forge test` command.

#### Starting Services

```bash
make start-all
```

- Starts the Anvil Ethereum node and WAVS using Docker Compose. Keep this running and open another terminal to execute other commands.
- **Under the hood**:
  - Cleans up any existing Docker containers.
  - Starts the Anvil Ethereum node directly on the host.
  - Runs `docker compose up` which:
    - Starts the main `wavs` service and the `aggregator` service.
    - Deploys EigenLayer core contracts for local development and your Service Manager contract which manages your AVS.

#### Deployment and Execution

```bash
export SERVICE_MANAGER_ADDR=`make get-eigen-service-manager-from-deploy`
forge script ./script/Deploy.s.sol ${SERVICE_MANAGER_ADDR} --sig "run(string)" --rpc-url http://localhost:8545 --broadcast
```

- **Under the hood**:
  1. Retrieves the deployed service manager address from `.docker/deployments.json`.
  2. Deploys the on-chain trigger and submission contracts.
  3. Links the submission contract to the Service Manager by passing the `_serviceManagerAddr` to its constructor.
  4. Saves the deployed contract addresses in `.docker/script_deploy.json`
  5. Uses the specified RPC URL to interact with the Ethereum node.
  6. Broadcasts the transaction to the network.

```bash
TRIGGER_EVENT="NewTrigger(bytes)" COMPONENT_FILENAME=usdt_balance.wasm make deploy-service
```
- **Purpose**: Registers the WASI component as a service with the WAVS network.
- **Under the hood**:
  1. Registers the service with the following configuration:
    - Specifies the compiled component to run (`--component`)
    - Sets the trigger event to watch for (`--trigger-event-name`)
    - Configures the trigger contract address (`--trigger-address`)
    - Configures the submission contract address (`--submit-address`)
    - Applies service configuration including fuel limits, gas limits, and environment variables (`--service-config`).
  2. The service configuration is stored off-chain and used by the WAVS operator to run the component

```bash
export COIN_MARKET_CAP_ID=1
export SERVICE_TRIGGER_ADDR=`make get-trigger-from-deploy`
forge script ./script/Trigger.s.sol ${SERVICE_TRIGGER_ADDR} ${COIN_MARKET_CAP_ID} --sig "run(string,string)" --rpc-url http://localhost:8545 --broadcast -v 4
```

- **Under the hood**:
  - Exports the `COIN_MARKET_CAP_ID` environment variable for use in subsequent commands.
  - Uses `jq` to extract the trigger address from `.docker/script_deploy.json`.
  - Executes the `Trigger.s.sol` script with the trigger address and `COIN_MARKET_CAP_ID`.
  - Uses the specified RPC URL to interact with the local Anvil node.
  - Broadcasts the transaction to the network.

#### Viewing Results

```bash
make show-result
```

- Uses the `ShowResult.s.sol` script to retrieve and display the result from the service.


### Makefile variables

The Makefile contains several important variables that control the behavior of the WAVS service.

#### Component variable

```bash
COMPONENT_FILENAME ?= eth_price_oracle.wasm
```

- Used by `wasi-exec` and `deploy-service` commands to identify which component to run or deploy.
- Change this filename to run a different service.

#### Service config

```bash
SERVICE_CONFIG ?= '{"fuel_limit":100000000,"max_gas":5000000,"host_envs":[],"kv":[],"workflow_id":"default","component_id":"default"}'
```

- Configures the WAVS service.
  - `fuel_limit`: Maximum computational resources the service can use
  - `max_gas`: Maximum gas limit for blockchain transactions
  - `host_envs`: List of private environment variables to expose to the component (values must be prefixed with `WAVS_ENV_`)
  - `kv`: Key-value pairs for public configuration
  - `workflow_id` and `component_id` are set as `default` in the template for simple services.

#### Network configuration

```bash
RPC_URL ?= http://localhost:8545
```

- Specifies the Ethereum RPC endpoint URL.

#### Trigger event

```bash
TRIGGER_EVENT ?= NewTrigger(bytes)
```

- Defines the event signature that WAVS will watch for on the blockchain.
- With WAVS, this can either be a hex-encoded event signature or an event name.
- `NewTrigger(bytes)` in this example is the trigger event from the template's trigger contract.

#### Trigger data

```bash
COIN_MARKET_CAP_ID ?= 1
```
- Specifies the `COIN_MARKET_CAP_ID` for testing the price oracle in `wasi-exec` and trigger scripts (`1` is the ID of Bitcoin in the `Eth-price-oracle` example).
- In the `ETH_PRICE_ORACLE` component, the input data needs to be formatted into a `bytes32` string in the `make wasi-exec` makefile command using `cast format-bytes32-string`. When creating your own components, update the makefile to use an appropriate format for your use case.

#### Contract addresses

```bash
SERVICE_MANAGER_ADDR ?= `jq -r '.eigen_service_managers.local | .[-1]' .docker/deployments.json`
SERVICE_TRIGGER_ADDR ?= `jq -r '.trigger' "./.docker/script_deploy.json"`
SERVICE_SUBMISSION_ADDR ?= `jq -r '.service_handler' "./.docker/script_deploy.json"`
```
- Automatically populated from deployment JSON files. Used by deployment and interaction commands.
- You can view the addresses of your deployed contracts using these commands:

View the addresses of your deployed contracts using these commands:

```bash
# View the trigger contract address
make get-trigger-from-deploy
# View the submission contract address
make get-service-handler-from-deploy
# View the service manager address
make get-eigen-service-manager-from-deploy
```

#### Customizing Makefile variables

Makefile variables can be overridden when running make commands. For example, running the following in your terminal will use a different component when testing:

```bash
COMPONENT_FILENAME=my_component.wasm COIN_MARKET_CAP_ID=1 make wasi-exec
```

To trigger the component from an external contract, you can set the trigger address and trigger event manually in the makefile:

```bash
TRIGGER_ADDRESS ?= 0x1234567890123456789012345678901234567890
TRIGGER_EVENT ?= MyCustomEvent(bytes)
```
{/* todo: link here: */}
You can also add variables to the makefile, such as public variables to be referenced in your component or reference private variables like API keys. Find out more in the [Environment Variables](#environment-variables) section.

## Toml files

There are several toml files in the template that are used to configure the service:

- `wavs.toml` is used to configure the WAVS service itself, including chain configurations (local, testnets, mainnet) and maximum WASM fuel limits.
- `cli.toml` is used to configure the WAVS CLI tool, and also includes chain configurations (local, testnets, mainnet), maximum WASM fuel limits, and log levels.
- `Cargo.toml` in the root directory is used to configure the workspace and includes dependencies, build settings, and component metadata.
- `/components/*/Cargo.toml` in each component directory is used to configure the Rust component and includes dependencies, build settings, and component metadata. It can inherit dependencies from the root `Cargo.toml` file using `workspace = true`.

These files can be customized to suit your specific needs, and many settings can be overridden using environment variables.

The following is an example of a component's `Cargo.toml` file structure:

```toml
# Package metadata - inherits most values from workspace configuration
[package]
name = "eth-price-oracle"        # Name of the component
edition.workspace = true         # Rust edition (inherited from workspace)
version.workspace = true         # Version (inherited from workspace)
authors.workspace = true         # Authors (inherited from workspace)
rust-version.workspace = true    # Minimum Rust version (inherited from workspace)
repository.workspace = true      # Repository URL (inherited from workspace)

# Component dependencies
[dependencies]
# Core dependencies
wit-bindgen-rt = {workspace = true}    # Required for WASI bindings and Guest trait
wavs-wasi-chain = { workspace = true }  # Required for core WAVS functionality
# Helpful dependencies
serde = { workspace = true }            # For serialization (if working with JSON)
serde_json = { workspace = true }       # For JSON handling
alloy-sol-macro = { workspace = true }  # For Ethereum contract interactions
wstd = { workspace = true }             # For WASI standard library features
alloy-sol-types = { workspace = true }  # For Ethereum ABI handling
anyhow = { workspace = true }           # For enhanced error handling

# Library configuration
[lib]
crate-type = ["cdylib"]  # Specifies this is a dynamic library crate

# Release build optimization settings
[profile.release]
codegen-units = 1        # Single codegen unit for better optimization
opt-level = "s"          # Optimize for size
debug = false            # Disable debug information
strip = true            # Strip symbols from binary
lto = true              # Enable link-time optimization

# WAVS component metadata
[package.metadata.component]
package = "component:eth-price-oracle"  # Component package name
target = "wavs:worker/layer-trigger-world@0.3.0"  # Target WAVS world and version
```

## Input and Output

When building WASI components, keep in mind that the component can receive the trigger data in two ways:

1. Triggered by an onchain event from a contract after service deployment. Components receive a `TriggerAction` containing event data which is then decoded.

2. Manually via the `wasi-exec` command. The wasi-exec command simulates an onchain event and passes the trigger data directly to the component as `trigger::raw`. No abi decoding is required, and the output is returned as raw bytes.
    - In the `ETH_PRICE_ORACLE` component, the input data needs to be formatted into a `bytes32` string using the `cast format-bytes32-string` when using the `make wasi-exec` command. When creating your own components, use an appropriate format for your use case to use the `wasi-exec` command.

### Data Processing Pattern

The example below shows a basic generic pattern for processing input data and returning output. In the example, the `sol!` macro generates Rust types from Solidity definitions, adds ABI encoding/decoding methods, and handles type conversions (e.g., `uint64` → `u64`). ABI encoding/decoding converts Rust structs to bytes and vice versa. The `decode_event_log_data!` macro decodes the raw event log data and returns a Rust struct matching your Solidity event. This is used for on-chain events.


```rust
// 1. Define your Solidity types using the `sol!` macro
sol! {
    event MyEvent(uint64 indexed triggerId, bytes data);
    struct MyResult {
        uint64 triggerId;
        bytes processedData;
    }
}

// 2. Handle on-chain event trigger and raw trigger types
impl Guest for Component {
    fn run(action: TriggerAction) -> Result<Option<Vec<u8>>, String> {
        match action.data {
            // On-chain event handling
            TriggerData::EthContractEvent(TriggerDataEthContractEvent { log, .. }) => {
                // Decode the event
                let event: MyEvent = decode_event_log_data!(log)?;
                
                // Process the data
                let result = MyResult {
                    triggerId: event.triggerId,
                    processedData: process_data(&event.data)?,
                };
                
                // Encode for submission
                Ok(Some(result.abi_encode()))
            }
            // Manual trigger handling for testing
            TriggerData::Raw(data) => {
                // Process raw data directly
                let result = process_data(&data)?;
                Ok(Some(result))
            }
            _ => Err("Unsupported trigger type".to_string())
        }
    }
}
```

In the template, encoding and decoding is handled in the `trigger.rs` file using a `Destination` enum to determine how to process and return data based on the trigger source. The `decode_trigger_event` function in `trigger.rs` determines the destination:

- For `TriggerData::EthContractEvent`, it returns `Destination::Ethereum`
- For `TriggerData::Raw` (used in testing), it returns `Destination::CliOutput`

This allows the component to handle both production and testing scenarios appropriately.

## Logging

Components can use logging to debug and track the execution of the component.

**Logging in development**:

Use `println!()` to write to stdout/stderr. This is visible when running `wasi-exec` locally.

```rust lib.rs
println!("Debug message: {:?}", data);
```

**Logging in production**

For production, you can use a `host::log()` function which takes a `LogLevel` and writes its output via the tracing mechanism. Along with the string that the developer provides, it attaches additional context such as the `ServiceID`, `WorkflowID`, and component `Digest`.

```rust lib.rs
host::log(LogLevel::Info, "Production logging message");
```

## Helpers and utilities

### `wavs-wasi-chain` crate

The `wavs-wasi-chain` crate provides a set of helpful functions for making HTTP requests and interacting with the blockchain. It also provides a macro for decoding trigger data for use in the component.

Learn more in the [crate documentation](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/all.html#functions).

### Sol! macro

The `sol!` macro from `alloy-sol-macro` allows you to generate Rust types from Solidity interface files. This is useful for handling blockchain events and data structures in components.


You can write Solidity definitions (interfaces, structs, enums, custom errors, events, and function signatures) directly inside the `sol! { ... }` macro invocation in your Rust code.

At compile time, the `sol!` macro parses that Solidity syntax and automatically generates the equivalent Rust types, structs, enums, and associated functions (like `abi_encode()` for calls or `abi_decode()` for return data/events) needed to interact with smart contracts based on those definitions.

Required Dependencies:

```toml
[dependencies]
alloy-sol-macro = { workspace = true }  # For Solidity type generation
alloy-sol-types = { workspace = true }  # For ABI handling
```

Basic Pattern:

```rust
mod solidity {
    use alloy_sol_macro::sol;
    
    // Generate types from Solidity file
    sol!("../../src/interfaces/ITypes.sol");
    
    // Or define types inline
    sol! {
        struct TriggerInfo {
            uint64 triggerId;
            bytes data;
        }
        
        event NewTrigger(TriggerInfo _triggerInfo);
    }
}
```

In the template, the `sol!` macro is used in the `trigger.rs` component file to generate Rust types from the `ITypes.sol` file.

```rust trigger.rs
mod solidity {
    use alloy_sol_macro::sol;
    pub use ITypes::*;

    // The objects here will be generated automatically into Rust types.
    // If you update the .sol file, you must re-run `cargo build` to see the changes.
    sol!("../../src/interfaces/ITypes.sol");
}
```

The macro reads a Solidity interface file and generates corresponding Rust types and encoding/decoding functions. In the example above, it reads `ITypes.sol` which defines:
- `NewTrigger` event
- `TriggerInfo` struct
- `DataWithId` struct

More documentation on the `sol!` macro can be found at: https://docs.rs/alloy-sol-macro/latest/alloy_sol_macro/macro.sol.html

## Environment Variables

Components can be configured with two types of variables:

### Public variables: `kv`

These variables can be used for non-sensitive information that can be viewed publicly. These variables can be configured in the makefile and are set during service deployment. They are accessed using `std::env::var` in the component.

To add public variables, modify the `"kv"` section in the `SERVICE_CONFIG` in your `Makefile`. The following example adds `max_retries`, `timeout_seconds`, and `api_endpoint` variables with values:

```bash
# makefile
SERVICE_CONFIG ?= '{"fuel_limit":100000000,"max_gas":5000000,"host_envs":[],"kv":[["max_retries","3"],["timeout_seconds","30"],["api_endpoint","https://api.example.com"]],"workflow_id":"default","component_id":"default"}'
```

Then use these variables in your component:

```rust
let max_retries = std::env::var("max_retries")?;
let timeout = std::env::var("timeout_seconds")?;
let endpoint = std::env::var("api_endpoint")?;
```

### Private variables: `host_envs`

Private environment variables (`host_envs`) can be used for sensitive data like API keys. These variables are set by operators in their environment and are not viewable by anyone. These variables must be prefixed with `WAVS_ENV_`. Each operator must set these variables in their environment before deploying the service. Only variables listed in `host_envs` will be available to the component.

To add private variables to your .env file, copy the `.env.example` file to `.env`:

```bash
# copy the example file
cp .env.example .env
```

Then set the environment variable in your `.env` file:

```bash
# .env file
WAVS_ENV_MY_API_KEY=your_secret_key_here
```

Variables can also be set in your `~/.bashrc` , `~/.zshrc` , or `~/.profile` files.

Then modify `"host_envs"` in the `SERVICE_CONFIG` section of your `Makefile`. The following example adds `WAVS_ENV_MY_API_KEY` to the `host_envs` array. Remember to add the `WAVS_ENV_` prefix to the variable name:

```bash
# makefile
SERVICE_CONFIG ?= '{"fuel_limit":100000000,"max_gas":5000000,"host_envs":["WAVS_ENV_MY_API_KEY"],"kv":[],"workflow_id":"default","component_id":"default"}'
```

This configuration is used during local testing with `make wasi-exec` and will also be applied when your service is deployed.

The following example shows how to access a private environment variable in a component:

```rust
let api_key = std::env::var("WAVS_ENV_MY_API_KEY")?;
```

## Network requests

Components can make network requests to external APIs using the `wavs-wasi-chain` crate. Since WASI components run in a synchronous environment but network requests are asynchronous, you can use `block_on` from the `wstd` crate to bridge this gap. The `block_on` function allows you to run async code within a synchronous context, which is essential for making HTTP requests in WAVS components.

To learn how to use private environment variables like API keys in a component, see the [Private Variables](#private-variables-host_envs) section.

The following dependencies are useful for making HTTP requests from a component. These are added to a component's `Cargo.toml` file:

```toml Cargo.toml
[dependencies]
wavs-wasi-chain = { workspace = true }  # HTTP utilities
wstd = { workspace = true }             # Runtime utilities (includes block_on)
serde = { workspace = true }            # Serialization
serde_json = { workspace = true }       # JSON handling
```

The following example shows how to make a basic HTTP GET request from a component:

```rust lib.rs
use wstd::runtime::block_on;  // Required for running async code

// Async function for the HTTP request
async fn make_request() -> Result<YourResponseType, String> {
    // Create the request
    let url = "https://api.example.com/endpoint";
    let mut req = http_request_get(&url).map_err(|e| e.to_string())?;
    
    // Add headers
    req.headers_mut().insert(
        "Accept",
        HeaderValue::from_static("application/json")
    );
    
    // Make the request and parse JSON response
    let json: YourResponseType = fetch_json(req)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(json)
}

// Main component logic that uses block_on
fn process_data() -> Result<YourResponseType, String> {
    // Use block_on to run the async function
    block_on(async move {
        make_request().await
    })?
}
```

For making POST requests with JSON data, you can use the [`http_request_post_json` helper function](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/http/fn.http_request_post_json.html), which automatically handles JSON serialization and sets header to `application/json`:

```rust lib.rs
async fn make_post_request() -> Result<PostResponse, String> {
    let url = "https://api.example.com/endpoint"; // The URL of the endpoint to make the request to
    let post_data = ("key1", "value1"); // any serializable data can be passed in
    
    // Make POST request and parse JSON response
    let response: PostResponse = fetch_json(
        http_request_post_json(&url, &post_data)?
    ).await.map_err(|e| e.to_string())?;
    
    Ok(response)
}

// Main component logic that uses block_on
fn process_data() -> Result<PostResponse, String> {
    // Use block_on to run the async function
    block_on(async move {
        make_post_request().await
    })?
}
```

Other functions are available in the [crate documentation](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/all.html#functions).

## Blockchain interactions

Interacting with blockchains like Ethereum requires specific dependencies and setup within your component.

### Dependencies

The following dependencies are commonly required in your component's `Cargo.toml` for Ethereum interactions:

```toml
[dependencies]
# Core WAVS blockchain functionality
wit-bindgen-rt = {workspace = true}    # Required for WASI bindings and Guest trait
wavs-wasi-chain = { workspace = true }  # HTTP utilities

# Alloy crates for Ethereum interaction
alloy-sol-types = { workspace = true }  # ABI handling & type generation
alloy-sol-macro = { workspace = true }  # sol! macro for interfaces
alloy-primitives = { workspace = true } # Core primitive types (Address, U256, etc.)
alloy-network = "0.11.1"                 # Network trait and Ethereum network type
alloy-provider = { version = "0.11.1", default-features = false, features = ["rpc-api"] } # RPC provider
alloy-rpc-types = "0.11.1"                # RPC type definitions (TransactionRequest, etc.)

# Other useful crates
anyhow = { workspace = true }          # Error handling
serde = { workspace = true }           # Serialization/deserialization
serde_json = { workspace = true }      # JSON handling
```

### Chain Configuration

Chain configurations are defined in the root `wavs.toml` file. This allows components to access RPC endpoints and chain IDs without hardcoding them.

```toml wavs.toml
[chains.eth.local]
chain_id = "31337"
ws_endpoint = "ws://localhost:8545"
http_endpoint = "http://localhost:8545"

[chains.eth.mainnet]
chain_id = "1"
ws_endpoint = "wss://mainnet.infura.io/ws/v3/YOUR_INFURA_ID"
http_endpoint = "https://mainnet.infura.io/v3/YOUR_INFURA_ID"
```

### Accessing Configuration and Provider

WAVS provides host bindings to get the chain config for a given chain name in the wavs.toml file:

```rust lib.rs
// Get the chain config for an Ethereum chain
let chain_config = host::get_eth_chain_config(&chain_name)?;

// Get the chain config for a Cosmos chain
let chain_config = host::get_cosmos_chain_config(&chain_name)?;
```

You can then use `wavs-wasi-chain` to create an RPC provider using the [`new_eth_provider` function](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/ethereum/fn.new_eth_provider.html):

```rust lib.rs
use crate::bindings::host::{get_eth_chain_config, get_cosmos_chain_config}; // Import host functions
use wavs_wasi_chain::ethereum::new_eth_provider;
use alloy_provider::{Provider, RootProvider};
use alloy_network::Ethereum;
use anyhow::Context; // For context() error handling

// Get the chain config for a specific chain defined in wavs.toml
let chain_config = get_eth_chain_config("eth.local") // Use the key from wavs.toml (e.g., "eth.local" or "eth.mainnet")
    .map_err(|e| format!("Failed to get chain config: {}", e))?;

// Create an Alloy provider instance using the HTTP endpoint
let provider: RootProvider<Ethereum> = new_eth_provider::<Ethereum>(
    chain_config.http_endpoint
        .context("http_endpoint is missing in chain config")? // Ensure endpoint exists
)?;
```

### Example: Querying NFT Balance

Here's an example demonstrating how to query the balance of an ERC721 NFT contract for a given owner address.

```rust lib.rs
use crate::bindings::host::get_eth_chain_config;
use alloy_network::{Ethereum, Network};
use alloy_primitives::{Address, Bytes, TxKind, U256};
use alloy_provider::{Provider, RootProvider};
use alloy_rpc_types::{TransactionInput, eth::TransactionRequest}; // Note: use eth::TransactionRequest
use alloy_sol_types::{sol, SolCall}; // Removed unused SolType, SolValue
use wavs_wasi_chain::ethereum::new_eth_provider;
use anyhow::Context;
use wstd::runtime::block_on; // Required to run async code

// Define the ERC721 interface subset needed
sol! {
    interface IERC721 {
        function balanceOf(address owner) external view returns (uint256);
    }
}

// Function to query NFT ownership (must be async)
pub async fn query_nft_ownership(owner_address: Address, nft_contract: Address) -> Result<bool, String> {
    // 1. Get chain configuration (using "eth.local" as an example)
    let chain_config = get_eth_chain_config("eth.local")
        .map_err(|e| format!("Failed to get eth.local chain config: {}", e))?;

    // 2. Create Ethereum provider
    let provider: RootProvider<Ethereum> = new_eth_provider::<Ethereum>(
        chain_config.http_endpoint
            .context("http_endpoint missing for eth.local")?
    ).map_err(|e| format!("Failed to create provider: {}", e))?; // Handle provider creation error

    // 3. Prepare the contract call using the generated interface
    let balance_call = IERC721::balanceOfCall { owner: owner_address };

    // 4. Construct the transaction request for a read-only call
    let tx = TransactionRequest {
        to: Some(TxKind::Call(nft_contract)), // Specify the contract to call
        input: TransactionInput {
            input: Some(balance_call.abi_encode().into()), // ABI-encoded call data
            data: None // `data` is deprecated, use `input`
        },
        // Other fields like nonce, gas, value are not needed for eth_call
        ..Default::default()
    };

    // 5. Execute the read-only call using the provider
    // Note: provider.call() returns the raw bytes result
    let result_bytes = provider.call(&tx)
        .await
        .map_err(|e| format!("Provider call failed: {}", e))?;

    // 6. Decode the result (balanceOf returns uint256)
    // Ensure the result is exactly 32 bytes for U256::from_be_slice
    if result_bytes.len() != 32 {
        return Err(format!("Unexpected result length: {}", result_bytes.len()));
    }
    let balance = U256::from_be_slice(&result_bytes);

    // 7. Determine ownership based on balance
    Ok(balance > U256::ZERO)
}

// Example of how to call the async function from the main sync component logic
fn main_logic(owner: Address, contract: Address) -> Result<bool, String> {
    let is_owner = block_on(async move {
        query_nft_ownership(owner, contract).await
    })?; // Use block_on to run the async function
    Ok(is_owner)
}
```

This example covers:
1.  **Defining the Interface**: Using `sol!` to create Rust bindings for the `balanceOf` function.
2.  **Provider Setup**: Getting configuration and creating an `alloy` provider.
3.  **Call Preparation**: Encoding the function call data using generated types.
4.  **Transaction Request**: Building the request for an `eth_call`.
5.  **Execution**: Using `provider.call()` to interact with the node.
6.  **Decoding**: Parsing the returned bytes into the expected `U256` type.
7.  **Async Handling**: Using `async fn` and `block_on` for asynchronous network operations within the synchronous component environment.

Visit the [wavs-wasi-chain documentation](https://docs.rs/wavs-wasi-chain/latest/wavs_wasi_chain/index.html) and the [Alloy documentation](https://docs.rs/alloy/latest/alloy/) for more detailed information.
````

## File: docs/design.mdx
````
---
title: WAVS design considerations
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { DocsPage } from 'fumadocs-ui/page';
docsignore-->

The WAVS approach to AVS design focuses on the lightweight and agile nature of components, with an emphasis on performance and security.

WAVS works best with the "serverless function" approach, wherein the priority of service component logic is to process data from external sources rather than store it locally. In this model, a component can receive input data from external sources, process it, and submit the verifiable outputs to external sources.

## Aggregation and deterministic queries

WAVS currently supports "exact match" [aggregation](./how-it-works#signing-and-aggregation), meaning that consensus is reached if 2/3 of submitted responses from operators are identical. This approach fits many common use cases, but it means that developers must build their components to receive and process data only from deterministic or immutable sources, such as:

- Data from the input event trigger
- Ethereum queries at a given block height
- IPFS data or other Content-Addressable Storage
- Web2 APIs that are trusted to return the same result on every query

For example, when designing a price oracle, a **blockheight** or **timestamp** should be specified in the query logic. This ensures that the query is deterministic and that the same data point is retrieved by all operators.

Conversely, a component that is designed to fetch "current price" would be non-deterministic and may result in a consensus error. Operators may run components at slightly different times, leading to discrepancies in the data they receive. This design should be avoided, as aggregation for this would require custom BFT averaging logic which is not currently supported. However, adding custom logic to process non-exact matches will be available in future releases.

## State

Persistent state introduces additional challenges in AVS design with WAVS: operators may execute triggers at different times or, in some cases, not run them at all if they join an AVS after it has been running for some time. Components that rely on operator-local mutable state risk failing consensus due to inconsistencies in execution. For these reasons, it is best practice to avoid storing operator-local mutable state within your components.

This functionality would require features such as state synchronization, guaranteed execution ordering, and Merkle-proof validation which are not yet supported.

## Caching

WAVS provides components with an optional local data directory that can be used for caching. This storage method should only be used to cache data as a performance optimization and not as a replacement for external state stores.

It is best practice when using a cache to reference external data from deterministic immutable sources to avoid consensus failures.

Keep the following points in mind when using cached data:

1. Caching should be used as a performance optimization only.
2. Use immutable or deterministic external data sources with specific time stamps or block heights.
3. Design your component logic to work even if the cache is cleared. Cache state is not shared among operators, and any operator should be able to rebuild the cache from scratch.
4. Don't use caching to store state that depends on previous executions or mutable data.
````

## File: docs/how-it-works.mdx
````
---
title: How it works
---
<!--docsignore
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
docsignore-->

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/banners/how.png" />

WAVS is a decentralized execution framework for AVSs (Autonomous Verifiable Services), enabling the results of off-chain computation to be brought verifiably on-chain. It provides a runtime for executing WASI-based service components, allowing developers to define event-driven off-chain workflows while inheriting Ethereum's security via EigenLayer restaking.

When an on-chain contract emits an event, WAVS operators listen, execute the corresponding service component off-chain, and sign the result. Results can then be submitted on-chain or passed to other services. This allows AVSs to process complex computations off-chain at near-native speed while maintaining on-chain verifiability.

The WAVS platform comprises service components, operator networks, and on-chain contracts, forming a decentralized execution layer that extends the capabilities of smart contracts to off-chain executions.


## The flow

Before diving into each part of a WAVS service individually, it's important to understand the basic execution flow of WAVS.

<img alt="WAVS overview" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/diagrams/flow.png" />

In this example, on-chain events can trigger service components, which are run off-chain by operators in the WASI AVS runtime. Results are then brought back on-chain, enabling the decentralized execution of off-chain services that are verifiable on-chain.

1. An AVS builder defines their service with a [trigger](#triggers), a [service component](#service-components), and [submission](#submission) logic.
2. Operators listen for on-chain events specified in the trigger contract.
3. An on-chain event triggers a task, and operators run the corresponding service component off-chain.
4. Operators sign the result of the task, and the signatures are sent to the aggregator (optional).
5. Results are aggregated and submitted on-chain according to the [submission logic](#submission).

## WAVS parts

The WAVS platform consists of several different parts that work together to form a decentralized off-chain execution layer for AVSs.

- [Triggers](#triggers): defined events that trigger a component to be run.
- [Service components](#service-components): WASI components written in Rust (with support for other languages coming soon) that contain the core logic of a service.
- [Submission](#submission): contracts for the on-chain submission of results.
- [The WAVS runtime](#wavs-runtime): an off-chain execution environment for service components powered by WASM.
- [Operators](#operators): node participants that opt into running services.

## Triggers

A trigger is any on-chain event that activates a WAVS service. Rather than requiring a specific contract interface, WAVS allows AVS builders to designate any event from any smart contract as a trigger. In the near future, other triggers will also be enabled, such as cron, off-chain triggers, and even triggers from contracts on other chains.

AVS builders can specify the exact events that operators should listen for, defining:
- The contract address emitting the event.
- The event signature (`topic 0` in Ethereum, `event.ty` in Cosmos).

When a specified event is emitted on-chain, WAVS operators detect it and execute the corresponding service component off-chain. The results are then verified and submitted back on-chain, completing the execution cycle.

## Service components

Service components are the heart of the WAVS platform, encapsulating the core logic that powers a service. They are written in Rust (with support for other languages coming soon), which contains all the necessary computational logic to run a service. These service components are compiled to WASM and are uploaded to the WAVS platform where they can be run by operators. In the WAVS runtime, service components are sandboxed from each other and from the node's operating system. This way, operators and AVS services maintain a clean separation, with AVS builders defining service components and operators having to opt in to each service.

Service components are lightweight and built for adaptability. Building a service used to take thousands of lines of code and the configuration of dozens of files to execute even the simplest logic. With WAVS, service components can consist of a few lines of code that can be dynamically deployed to the WAVS platform.

Service components are also designed for composability: an AVS can chain multiple components together, creating decentralized flows of off-chain and on-chain executions. These intelligent protocols merge the performance of off-chain computation with on-chain verifiability, creating a complex mesh of decentralized transaction flows.

To learn more about designing a component, visit the [design considerations page](./design). For a hands-on example of a service component, visit the [tutorial](./tutorial/1-overview).

## Submission

Submission logic defines what is done with the result of a service component after it has been run. Known as a Service Handler, this logic can be any contract as long as it implements the [`IWavsServiceHandler` interface](https://www.npmjs.com/package/@wavs/solidity?activeTab=code). This contract is specified when [deploying a WAVS service](./tutorial/6-run-service#deploy-your-service-to-wavs).

After the execution of a service component in the WAVS runtime, the results are passed to this contract, which can contain validation and submission logic for the service. Developers can use this contract to define their own logic for results and implement different rules depending on the specific needs of their service.

You can view an example service handler contract in the template tutorial. This service handler contract [calls the `Service Manager` contract](https://github.com/Lay3rLabs/wavs-foundry-template/blob/v0.3.0/src/contracts/WavsSubmit.sol) to validate operator signatures before executing the business logic (storing BTC price onchain in this case). This contract contains a basic example of verifying submission data, however, a submission contract can theoretically contain any business logic that a service may need.

## WAVS Runtime

The WAVS (WASI-AVS) runtime serves as the off-chain execution environment for all services running on the WAVS platform. Powered by operators running the WAVS node software, it provides a structured framework for deploying and managing service components that run within a WASI (WebAssembly System Interface) environment.
You can think of WASI as a lightweight OS-like interface, offering a standard set of APIs that allow service components to perform system-level operations such as file handling and environment interactions. WAVS enables service components to execute securely within this WASI-powered sandbox, ensuring isolation from both the host system and other components.

### WASM and WASI

[WASM (Web Assembly)](https://webassembly.org/) is a high-performance, low-level binary format that can be compiled from multiple programming languages. WASM can even run in web browsers at near-native speed. By leveraging WASM, AVSs built with WAVS are lightning-fast, lightweight, and easy to develop.

WASI (WebAssembly System Interface) is a standardized API that enables WASM (WebAssembly) modules to interact with a host system in a secure and platform-independent way. It provides WASM modules with a standardized set of APIs to access system resources. For more information, visit the [WASI documentation](https://wasi.dev/).

There are significant advantages in leveraging a WASM/WASI-based platform for AVSs:

- Lightweight execution: Service components are lightweight WASM binaries ideal for high-frequency, low-latency AVS tasks.
- Speed: components can run in the WASI environment at near-native speeds, providing a significant advantage over Dockerized AVSs.
- Low overhead: Instead of each service needing its own dedicated Docker container, the WAVS runtime provides a computational layer that can be used by many components, saving storage and startup time.
- Dynamic deployment: to upgrade a service, simply upload a new component and update your service metadata to point to the new component. No more downtime or coordination of new binaries among operators.
- Security and separation: The WAVS WASI runtime enforces security by sandboxing service components, allowing them to interact with the host (WAVS) only through explicitly permitted WASI APIs.

## Operators

Operators are network participants that run the WAVS runtime and "operate" different services. Similar to validators in a proof-of-stake network, users can stake (or restake) to operators and provide crypto-economic security to services.

Operators can opt in to running different services by registering with them. Once registered, operators listen for on-chain triggers and run the associated service component off-chain. Then, the operator takes the results of the computation, verifies them, and submits them on-chain.

### Signing and aggregation

When a service is triggered, each operator registered to the service will run the service component on their machine and generate the result. These results are signed by the operator before being submitted.

For services that submit results on Ethereum, an off-chain aggregator can be used to conserve gas fees. Instead of each individual operator submitting results of a service directly on-chain (which would be costly), operators sign the results and submit them off-chain to an aggregator, which aggregates the results and submits a result to be posted to the chain in a single transaction. Results are signed using an operator's individual private key to produce an ECDSA signature, which is used to prove that the result is associated with an operator's specific private and public key pair. The aggregator accepts the result submissions from operators, verifies their validity, and compares the responses. If there is a consensus among operators on a single result, it is submitted on-chain as a single transaction. This method ensures that results are verifiably accurate while saving on transaction costs. Aggregation is an optional feature that can be defined in a service. Support for BLS signatures and a decentralized aggregator are currently under development.

To learn more about the aggregator and designing a component, visit the [design considerations page](./design).

## Updating a service

Because of the lightweight and portable nature of WebAssembly, WAVS operators only need to run a single Docker image. WAVS provides a runtime for all registered services to run, each sandboxed from the other and from the node's operating system due to the nature of [WASI](#wasm-and-wasi). Operators will need to opt in to running different services by registering to an AVS.

Updates to service logic do not require node upgrades. Instead, developers can dynamically deploy a new service component and update their service. Instead of needing to run a new Docker image every time a service is updated, operators only need to upgrade if there is a breaking change to the WAVS node software itself.
````

## File: docs/index.mdx
````
---
title: WAVS Docs
---
<!--docsignore
import { HomeIcon, AppWindow, CircuitBoard, Layers, Microscope, Grid2x2, ChevronRight } from 'lucide-react';
import { Callout } from 'fumadocs-ui/components/callout';
import { DocsPage } from 'fumadocs-ui/page';
docsignore-->

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/wavs.png" />

Welcome to the WAVS Docs!

WAVS is a next-generation AVS platform that makes it easy to create, manage, and operate high-performance AVSs. Use this documentation to learn [about WAVS](/overview), [how it works](/how-it-works), and how to [start building your AVS](./tutorial/1-overview).

<!--docsignore
## Get started

<Cards>
  <Card
    icon={<CircuitBoard />}
    href="/overview"
    title="WAVS Overview"
    description="Learn about WAVS"
  />
  <Card
    icon={<Microscope />}
    href="/how-it-works"
    title="How it works"
    description="Explore the inner workings of WAVS"
  />
    <Card
    icon={<ChevronRight />}
    href="/benefits"
    title="WAVS Benefits"
    description="Discover how WAVS revolutionizes AVS creation"
  />
      <Card
    icon={<Layers />}
    href="/tutorial/1-overview"
    title="Build a service"
    description="Follow the WAVS tutorial to build a service"
  />

</Cards>
docsignore-->
````

## File: docs/overview.mdx
````
---
title: Overview
---
<!--docsignore
import { HomeIcon, AppWindow, CircuitBoard, Layers, Microscope, Grid2x2, ChevronRight } from 'lucide-react';
import { Callout } from 'fumadocs-ui/components/callout';
import { DocsPage } from 'fumadocs-ui/page';
docsignore-->

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/banners/intro.png" />

## What is WAVS?

WAVS is a [WASI](./how-it-works#wasm-and-wasi) runtime for building AVSs (Autonomous Verifiable Services). With WAVS, you can create, manage, and operate high-performance AVSs using the languages you already know and love (like Rust—more languages coming soon). By providing a base layer of AVS infrastructure, WAVS lets you focus on implementing the core logic of your service. WAVS compiles that logic to [WASM](./how-it-works#wasm-and-wasi), and lets you deploy it as lightweight service components.

Better yet, WAVS solves the trust problem in off-chain compute: it separates services from the operators that run them. Builders create their components, and operators run them in WAVS runtime at near-native speed. Then, operators sign the results of the off-chain computation and place them on-chain. Boom: off-chain compute with on-chain verifiability.

> In simple terms, WAVS streamlines the process of building and managing an AVS.

Finally, WAVS utilizes restaking (via EigenLayer) to secure its AVSs. A service of services, WAVS is composable by nature, allowing an AVS to dynamically run and manage multiple components that work together to build flexible and intelligent applications.


## Use cases

WAVS supports a wide range of AVS use cases, enabling powerful, verifiable off-chain computation across different domains:

- **Decentralized AI**: WAVS unlocks decentralized AI that is [deterministic and verifiable](https://www.layer.xyz/news-and-insights/deterministic-ai), enabling trustless decision-making and autonomous governance through DAO-controlled AI agents.
- **Oracles**: [Create](./tutorial/1-overview) and dynamically deploy new oracles as easily as uploading a component to your service to verifiably bring data from any source on-chain.
- **Zero Knowledge Proofs**: ZK verifiers, ZK Prover Marketplaces, and ZK aggregation layers can be deployed as lightweight WAVS [service components](#service-components), making it simple to build modular and composable proof services.
- **Crosschain Bridges**: Build secure, decentralized bridges with WAVS. Lock assets on one chain, trigger a verifiable service component, and mint them on another—all with trust-minimized execution.
- **Dynamic applications**: WAVS combines on-chain and off-chain services to build a cross-chain, decentralized application layer.
- **Intelligent protocols**: Build protocols that are verifiably aware of on-chain and off-chain events without relying on centralized infrastructure. Compose services and applications to enable complex webs of decentralized transaction flows.

## Building a service

WAVS removes the complexity of building an AVS, making it easy to develop and deploy custom services. With built-in AVS infrastructure and developer tooling, WAVS powers a new multichain ecosystem of composable, decentralized, and verifiable applications.

<Callout title="Learn more" type="info">
The following is a basic overview of a WAVS service. For a more in-depth overview of WAVS, visit the [How it works section](./how-it-works). Check out the WAVS tutorial to learn how to build a service.
</Callout>

This example will cover a basic AVS with three parts: a trigger, a service component, and submission logic.

### Defining triggers

Triggers are the actions or events that prompt your service to be run. Currently, WAVS supports triggers from on-chain events (with support for cron schedules and off-chain triggers coming soon). On-chain event triggers can be used to pass arbitrary data as the inputs for service components to be run. Operators running a service listen for specific trigger events and run the corresponding service component.

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/diagrams/trigger.png" />

To learn more about triggers, visit the [How it works](./how-it-works#triggers) page.

### Service components

Service components are the core logic of an AVS. They are written in Rust (with more languages coming soon) and compiled to [WASM](./how-it-works#wasm-and-wasi) as lightweight WASI components. WAVS provides a base layer of AVS infrastructure, allowing you to focus solely on the logic of your service.

Service components can contain logic for processing input data from triggers. If an on-chain trigger passes data, a service component can use that data as input. For example, a simple service component could contain logic for receiving a number as input and returning the square of that number as output.

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/diagrams/service.png" />

To learn more about service components, visit the [How it works](/how-it-works#service-components) page. Check out the [WAVS tutorial](./tutorial/1-overview) to learn how to create a service component.


### Submission logic

Along with your component, you'll also need to define how the results of your service are submitted on-chain. With WAVS, you can use [submission contracts](/how-it-works#submission) to define this logic.


### Run your Service

Once a trigger, a service component, and submission logic are created, you can deploy your service. Operators will then listen for the triggers specified by your service. Once triggered, operators will run your service off-chain, where data from a trigger is passed to a service component and run in a sandboxed WASI environment. Operators sign the result of the service computation and the verified result can be returned as an on-chain response.

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/diagrams/wavs-flow.png" />


With WAVS, service updates are streamlined: updates to services can be made by AVS builders directly without needing to coordinate with operators. Operators only need to upgrade if there is a change to the WAVS node software itself.

## Multichain capability

WAVS is built to be multichain. A service can be triggered by events on one chain, run by operators off-chain, and write verified responses to another chain. This interoperability is what makes WAVS so flexible, creating a decentralized computational layer that can function across multiple chains.

## Security

The WAVS platform is secured via Ethereum restaking on EigenLayer, which provides a base security layer for AVSs built using WAVS. Restaking refers to the utilization of staked Ethereum to secure AVSs by imposing additional slashing terms on the staked Ethereum for operator misbehavior. In this way, the cryptoeconomic security of Ethereum is extended to WAVS AVSs.

## Full-Stack Decentralization

WAVS enables full-stack decentralization by unifying off-chain computation with on-chain verifiability. The chain layer connects to Ethereum and other chains, while the security layer extends cryptoeconomic security via EigenLayer restaking. At the AVS layer, lightweight WAVS powers WASM-based services to process off-chain computations triggered by on-chain events. Operators validate, sign, and commit the results back on-chain, ensuring verifiability and trust-minimized execution. This architecture makes WAVS a scalable, decentralized framework for full-stack applications.

<img alt="WAVS" src="https://raw.githubusercontent.com/Lay3rLabs/WAVS-docs/refs/heads/main/public/diagrams/security.png" />
````

## File: script/.solhint.json
````json
{
  "rules": {
    "ordering": "off",
    "one-contract-per-file": "off",
    "no-console": "off",
    "style-guide-casing": "off"
  }
}
````

## File: script/Common.s.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {Script} from "forge-std/Script.sol";

/// @dev Struct to store Eigen contracts
struct EigenContracts {
    address delegation_manager;
    address rewards_coordinator;
    address avs_directory;
}

/// @dev Common script for all deployment scripts
contract Common is Script {
    uint256 internal _privateKey =
        vm.envOr("ANVIL_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
}
````

## File: script/Deploy.s.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {stdJson} from "forge-std/StdJson.sol";
import {Strings} from "@openzeppelin-contracts/utils/Strings.sol";
import {IWavsServiceManager} from "@wavs/interfaces/IWavsServiceManager.sol";
import {SimpleSubmit} from "contracts/WavsSubmit.sol";
import {SimpleTrigger} from "contracts/WavsTrigger.sol";
import {Common, EigenContracts} from "script/Common.s.sol";

/// @dev Deployment script for SimpleSubmit and SimpleTrigger contracts
contract Deploy is Common {
    using stdJson for string;

    string public root = vm.projectRoot();
    string public deployments_path = string.concat(root, "/.docker/deployments.json");
    string public script_output_path = string.concat(root, "/.docker/script_deploy.json");

    /**
     * @dev Deploys the SimpleSubmit and SimpleTrigger contracts and writes the results to a JSON file
     * @param _serviceManagerAddr The address of the service manager
     */
    function run(string calldata _serviceManagerAddr) public {
        vm.startBroadcast(_privateKey);
        SimpleSubmit _submit = new SimpleSubmit(IWavsServiceManager(vm.parseAddress(_serviceManagerAddr)));
        SimpleTrigger _trigger = new SimpleTrigger();
        vm.stopBroadcast();

        string memory _json = "json";
        _json.serialize("service_handler", Strings.toHexString(address(_submit)));
        _json.serialize("trigger", Strings.toHexString(address(_trigger)));
        string memory _finalJson = _json.serialize("service_manager", _serviceManagerAddr);
        vm.writeFile(script_output_path, _finalJson);
    }

    /**
     * @dev Loads the Eigen contracts from the deployments.json file
     * @return _fixture The Eigen contracts
     */
    function loadEigenContractsFromFS() public view returns (EigenContracts memory _fixture) {
        address _dm = _jsonBytesToAddress(".eigen_core.local.delegation_manager");
        address _rc = _jsonBytesToAddress(".eigen_core.local.rewards_coordinator");
        address _avs = _jsonBytesToAddress(".eigen_core.local.avs_directory");

        _fixture = EigenContracts({delegation_manager: _dm, rewards_coordinator: _rc, avs_directory: _avs});
    }

    /**
     * @dev Loads the service managers from the deployments.json file
     * @return _service_managers The list of service managers
     */
    function loadServiceManagersFromFS() public view returns (address[] memory _service_managers) {
        _service_managers = vm.readFile(deployments_path).readAddressArray(".eigen_service_managers.local");
    }

    // --- Internal Utils ---

    /**
     * @dev Converts a string to an address
     * @param _byteString The string to convert
     * @return _address The address
     */
    function _jsonBytesToAddress(string memory _byteString) internal view returns (address _address) {
        _address = address(uint160(bytes20(vm.readFile(deployments_path).readBytes(_byteString))));
    }
}
````

## File: script/ShowResult.s.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {SimpleTrigger} from "contracts/WavsTrigger.sol";
import {SimpleSubmit} from "contracts/WavsSubmit.sol";
import {ITypes} from "interfaces/ITypes.sol";
import {Common} from "script/Common.s.sol";
import {console} from "forge-std/console.sol";

/// @dev Script to show the result of a trigger
contract ShowResult is Common {
    function run(string calldata serviceTriggerAddr, string calldata serviceHandlerAddr) public {
        vm.startBroadcast(_privateKey);
        SimpleTrigger trigger = SimpleTrigger(vm.parseAddress(serviceTriggerAddr));
        SimpleSubmit submit = SimpleSubmit(vm.parseAddress(serviceHandlerAddr));

        ITypes.TriggerId triggerId = trigger.nextTriggerId();
        console.log("Fetching data for TriggerId", ITypes.TriggerId.unwrap(triggerId));

        bytes memory data = submit.getData(triggerId);
        console.log("Data:", string(data));

        vm.stopBroadcast();
    }
}
````

## File: script/Trigger.s.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {SimpleTrigger} from "contracts/WavsTrigger.sol";
import {ITypes} from "interfaces/ITypes.sol";
import {Common} from "script/Common.s.sol";
import {console} from "forge-std/console.sol";

/// @dev Script to add a new trigger
contract Trigger is Common {
    function run(string calldata serviceTriggerAddr, string calldata coinMarketCapID) public {
        vm.startBroadcast(_privateKey);
        SimpleTrigger trigger = SimpleTrigger(vm.parseAddress(serviceTriggerAddr));

        trigger.addTrigger(abi.encodePacked(coinMarketCapID));
        ITypes.TriggerId triggerId = trigger.nextTriggerId();
        console.log("TriggerId", ITypes.TriggerId.unwrap(triggerId));
        vm.stopBroadcast();
    }
}
````

## File: src/contracts/WavsSubmit.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IWavsServiceManager} from "@wavs/interfaces/IWavsServiceManager.sol";
import {IWavsServiceHandler} from "@wavs/interfaces/IWavsServiceHandler.sol";
import {ISimpleSubmit} from "interfaces/IWavsSubmit.sol";

contract SimpleSubmit is ISimpleSubmit, IWavsServiceHandler {
    /// @notice Mapping of valid triggers
    mapping(TriggerId _triggerId => bool _isValid) internal _validTriggers;
    /// @notice Mapping of trigger data
    mapping(TriggerId _triggerId => bytes _data) internal _datas;
    /// @notice Mapping of trigger signatures
    mapping(TriggerId _triggerId => bytes _signature) internal _signatures;

    /// @notice Service manager instance
    IWavsServiceManager private _serviceManager;

    /**
     * @notice Initialize the contract
     * @param serviceManager The service manager instance
     */
    constructor(IWavsServiceManager serviceManager) {
        _serviceManager = serviceManager;
    }

    /// @inheritdoc IWavsServiceHandler
    function handleSignedData(bytes calldata _data, bytes calldata _signature) external {
        _serviceManager.validate(_data, _signature);

        DataWithId memory dataWithId = abi.decode(_data, (DataWithId));

        _signatures[dataWithId.triggerId] = _signature;
        _datas[dataWithId.triggerId] = dataWithId.data;
        _validTriggers[dataWithId.triggerId] = true;
    }

    /// @inheritdoc ISimpleSubmit
    function isValidTriggerId(TriggerId _triggerId) external view returns (bool _isValid) {
        _isValid = _validTriggers[_triggerId];
    }

    /// @inheritdoc ISimpleSubmit
    function getSignature(TriggerId _triggerId) external view returns (bytes memory _signature) {
        _signature = _signatures[_triggerId];
    }

    /// @inheritdoc ISimpleSubmit
    function getData(TriggerId _triggerId) external view returns (bytes memory _data) {
        _data = _datas[_triggerId];
    }
}
````

## File: src/contracts/WavsTrigger.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ISimpleTrigger} from "interfaces/IWavsTrigger.sol";

contract SimpleTrigger is ISimpleTrigger {
    /// @inheritdoc ISimpleTrigger
    TriggerId public nextTriggerId;

    /// @inheritdoc ISimpleTrigger
    mapping(TriggerId _triggerId => Trigger _trigger) public triggersById;
    /// @notice See ISimpleTrigger.triggerIdsByCreator
    mapping(address _creator => TriggerId[] _triggerIds) internal _triggerIdsByCreator;

    /// @inheritdoc ISimpleTrigger
    function addTrigger(bytes memory _data) external {
        // Get the next trigger id
        nextTriggerId = TriggerId.wrap(TriggerId.unwrap(nextTriggerId) + 1);
        TriggerId _triggerId = nextTriggerId;

        // Create the trigger
        Trigger memory _trigger = Trigger({creator: msg.sender, data: _data});

        // Update storages
        triggersById[_triggerId] = _trigger;
        _triggerIdsByCreator[msg.sender].push(_triggerId);

        TriggerInfo memory _triggerInfo =
            TriggerInfo({triggerId: _triggerId, creator: _trigger.creator, data: _trigger.data});

        emit NewTrigger(abi.encode(_triggerInfo));
    }

    /// @inheritdoc ISimpleTrigger
    function getTrigger(TriggerId triggerId) external view override returns (TriggerInfo memory _triggerInfo) {
        Trigger storage _trigger = triggersById[triggerId];
        _triggerInfo = TriggerInfo({triggerId: triggerId, creator: _trigger.creator, data: _trigger.data});
    }

    /// @inheritdoc ISimpleTrigger
    function triggerIdsByCreator(address _creator) external view returns (TriggerId[] memory _triggerIds) {
        _triggerIds = _triggerIdsByCreator[_creator];
    }
}
````

## File: src/interfaces/.solhint.json
````json
{
  "rules": {
    "ordering": "warn",
    "style-guide-casing": [
      "warn",
      {
        "ignoreExternalFunctions": true
      }
    ]
  }
}
````

## File: src/interfaces/ITypes.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface ITypes {
    /**
     * @notice Struct to store trigger information
     * @param triggerId Unique identifier for the trigger
     * @param data Data associated with the triggerId
     */
    struct DataWithId {
        TriggerId triggerId;
        bytes data;
    }

    /**
     * @notice Struct to store trigger information
     * @param triggerId Unique identifier for the trigger
     * @param creator Address of the creator of the trigger
     * @param data Data associated with the trigger
     */
    struct TriggerInfo {
        TriggerId triggerId;
        address creator;
        bytes data;
    }

    /**
     * @notice Event emitted when a new trigger is created
     * @param _triggerInfo Encoded TriggerInfo struct
     */
    event NewTrigger(bytes _triggerInfo);

    /// @notice TriggerId is a unique identifier for a trigger
    type TriggerId is uint64;
}
````

## File: src/interfaces/IWavsSubmit.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ITypes} from "interfaces/ITypes.sol";

interface ISimpleSubmit is ITypes {
    /*///////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Check if a triggerId is valid
     * @param _triggerId The identifier of the trigger
     * @return _isValid True if the trigger is valid, false otherwise
     */
    function isValidTriggerId(TriggerId _triggerId) external view returns (bool _isValid);

    /**
     * @notice Get the signature for a triggerId
     * @param _triggerId The identifier of the trigger
     * @return _signature The signature associated with the trigger
     */
    function getSignature(TriggerId _triggerId) external view returns (bytes memory _signature);

    /**
     * @notice Get the data for a triggerId
     * @param _triggerId The identifier of the trigger
     * @return _data The data associated with the trigger
     */
    function getData(TriggerId _triggerId) external view returns (bytes memory _data);
}
````

## File: src/interfaces/IWavsTrigger.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ITypes} from "interfaces/ITypes.sol";

interface ISimpleTrigger is ITypes {
    /**
     * @notice Struct to store trigger information
     * @param creator Address of the creator of the trigger
     * @param data Data associated with the trigger
     */
    struct Trigger {
        address creator;
        bytes data;
    }

    /*///////////////////////////////////////////////////////////////
                            LOGIC
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Add a new trigger
     * @param _data The request data (bytes)
     */
    function addTrigger(bytes memory _data) external;

    /**
     * @notice Get a single trigger by triggerId
     * @param _triggerId The identifier of the trigger
     * @return _triggerInfo The trigger info
     */
    function getTrigger(TriggerId _triggerId) external view returns (TriggerInfo memory _triggerInfo);

    /*///////////////////////////////////////////////////////////////
                            VARIABLES
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Get the next triggerId
     * @return _triggerId The next triggerId
     */
    function nextTriggerId() external view returns (TriggerId _triggerId);

    /**
     * @notice Get a single trigger by triggerId
     * @param _triggerId The identifier of the trigger
     * @return _creator The creator of the trigger
     * @return _data The data of the trigger
     */
    function triggersById(TriggerId _triggerId) external view returns (address _creator, bytes memory _data);

    /**
     * @notice Get all triggerIds by creator
     * @param _creator The address of the creator
     * @return _triggerIds The triggerIds
     */
    function triggerIdsByCreator(address _creator) external view returns (TriggerId[] memory _triggerIds);
}
````

## File: test/unit/WavsTrigger.t.sol
````
// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {Test} from "forge-std/Test.sol";
import {SimpleTrigger} from "contracts/WavsTrigger.sol";
import {ITypes} from "interfaces/ITypes.sol";

contract TriggerTest is Test {
    SimpleTrigger public simpleTrigger;

    function setUp() public {
        simpleTrigger = new SimpleTrigger();
    }

    function testTrigger() public {
        simpleTrigger.addTrigger("data1");

        ITypes.TriggerId triggerId = ITypes.TriggerId.wrap(1);
        ITypes.TriggerInfo memory trigger = simpleTrigger.getTrigger(triggerId);

        assertEq(trigger.creator, address(this));
        assertEq(trigger.data, "data1");
        assertEq(ITypes.TriggerId.unwrap(trigger.triggerId), ITypes.TriggerId.unwrap(triggerId));
    }
}
````

## File: test/.solhint.json
````json
{
  "rules": {
    "style-guide-casing": [
      "warn",
      {
        "ignorePublicFunctions":true,
        "ignoreExternalFunctions":true,
        "ignoreContracts":true
      }
    ],
    "no-global-import": "off",
    "max-states-count": "off",
    "ordering": "off",
    "one-contract-per-file": "off"
  }
}
````

## File: tools/upgrade.sh
````bash
#!/bin/bash

set -e

# Take first argument as the version to upgrade to
VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

# conditional sudo, just for docker
if groups | grep -q docker; then
  SUDO="";
else
  SUDO="sudo";
fi

# pull this version to ensure we have it
if ! ${SUDO} docker pull ghcr.io/lay3rlabs/wavs:${VERSION}; then
    echo "Invalid WAVS version, cannot pull ghcr.io/lay3rlabs/wavs:${VERSION}"
    exit 1
fi

# Update Makefile
sed -E -i "s/ghcr.io\/lay3rlabs\/wavs:[^ ]+/ghcr.io\/lay3rlabs\/wavs:${VERSION}/g" Makefile

# Update docker-compose.yml
sed -E -i "s/ghcr.io\/lay3rlabs\/wavs:[^\"]+/ghcr.io\/lay3rlabs\/wavs:${VERSION}/g" docker-compose.yml

# Update Cargo.toml (for crates dependencies)
sed -E -i "s/wavs-wasi-chain = \"[^\"]+/wavs-wasi-chain = \"${VERSION}/g" Cargo.toml

# Update [package.metadata.component] in components/*/Cargo.toml (for wit)
sed -E -i "s/wavs:worker\/layer-trigger-world@[^\"]+/wavs:worker\/layer-trigger-world@${VERSION}/g" components/*/Cargo.toml

# Rebuild with cargo component build in order to update bindings and Cargo.lock
rm components/*/src/bindings.rs
make wasi-build
````

## File: .env.example
````
# == project ==
# If you have custom env vars in your project, you can set them here
# You also must update the `host_envs` field in `SERVICE_CONFIG` in `Makefile` 
WAVS_ENV_YOURKEYHERE="00000000000000000000000000000000"

# WAVS
WAVS_DATA=~/wavs/data
WAVS_LOG_LEVEL="info"
WAVS_SUBMISSION_MNEMONIC="test test test test test test test test test test test junk"
WAVS_AGGREGATOR_MNEMONIC="test test test test test test test test test test test junk"
WAVS_COSMOS_SUBMISSION_MNEMONIC="cosmos mnemonic here"

# CLI
WAVS_CLI_DATA=~/wavs/cli
WAVS_CLI_COSMOS_MNEMONIC="cosmos mnemonic here"
WAVS_CLI_ETH_MNEMONIC="test test test test test test test test test test test junk"
WAVS_CLI_LOG_LEVEL="info, wavs_cli=debug"

# Aggregator
WAVS_AGGREGATOR_DATA=~/wavs/aggregator
WAVS_AGGREGATOR_MNEMONIC="test test test test test test test test test test test junk"
````

## File: .gitignore
````
/target
out/
cache/
broadcast/
compiled/*.wasm
.docker/*.json
.env
node_modules/
lcov.info
````

## File: .solhint.json
````json
{
  "extends": "solhint:recommended",
  "rules": {
    "compiler-version": ["warn"],
    "quotes": "off",
    "func-visibility": ["warn", { "ignoreConstructors": true }],
    "no-inline-assembly": "off",
    "no-empty-blocks": "off",
    "private-vars-leading-underscore": ["warn", { "strict": false }],
    "ordering": "warn",
    "avoid-low-level-calls": "off",
    "named-parameters-mapping": "warn"
  }
}
````

## File: aggregator.toml
````toml
# the allowed cors origins. Default is empty list.
cors_allowed_origins = [
  "https://lay3rlabs.github.io/*",
  "http://localhost:*",
  "http://127.0.0.1:*",
]

# the directory to store the data. Default is "/var/wavs-aggregator"
# data = "~/wavs/aggregator"

chain = "local"

[chains.eth.local]
chain_id = "31337"
ws_endpoint = "ws://localhost:8545"
http_endpoint = "http://localhost:8545"

tasks_quorum = 1
````

## File: Cargo-component.lock
````
# This file is automatically generated by cargo-component.
# It is not intended for manual editing.
version = 1

[[package]]
name = "wavs:worker"

[[package.version]]
requirement = "^0.3.0"
version = "0.3.0"
digest = "sha256:dbbc4632d367c5eb0cbe91438a961c443ecad81260a36007fe9269539bed6c41"
````

## File: Cargo.toml
````toml
[workspace]
members = [
    "components/*",
]
resolver = "2"

[workspace.package]
edition = "2021"
version = "0.3.0"
license = "MIT"
authors = ["Lay3r Labs Team"]
repository = "https://github.com/Lay3rLabs/wavs"
rust-version = "1.80.0"

[workspace.dependencies]
# WASI
wit-bindgen-rt = {version = "0.39.0", features = ["bitflags"]}
wit-bindgen = "0.39.0"
wstd = "0.5.1"
wasi = "0.14.1"
wavs-wasi-chain = "0.3.0"

# Other
serde = { version = "1.0.217", features = ["derive"] }
serde_json = "1.0.138"
anyhow = "1.0.95"

## Alloy
alloy-sol-macro = { version = "0.8.13", features = ["json"]}
alloy-sol-types = "0.8.13"
````

## File: CHANGELOG.md
````markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [unreleased]

## v0.3.0-alpha.4

### Added

* Support for v0.3.0-alpha.4 of WAVS.

## v0.3.0-alpha.1

**2024/01/29**

### Added

* (initial) Initial integration with WAVS v0.3.0-alpha1.
````

## File: cli.toml
````toml
# these values can be overriden by environment variables
# by following the pattern WAVS_CLI_<UPPERCASE_KEY>
# so for example, the key `http_endpoint` can be overriden by setting the environment variable `WAVS_CLI_WAVS_ENDPOINT`
# for arrays use a comma-separated list in a single string

# The log level, in the format of tracing directives. Default is ["info"]
# See https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html#directives for more information
# e.g. WAVS_CLI_LOG_LEVEL="info, wavs=debug"
log_level = ["info", "wavs=debug"]

# the directory to store the data. Default is "/var/wavs-cli"
# data = "~/wavs/cli"

# wavs endpoint
# wavs_endpoint = "http://localhost:8000"

[chains.cosmos.layer-local]
chain_id = "slay3r-local"
bech32_prefix = "layer"
rpc_endpoint = "http://localhost:26657"
grpc_endpoint = "http://localhost:9090"
gas_price = 0.025
gas_denom = "uslay"
faucet_endpoint = "http://localhost:8000"

# localnode is local testing inside localnode docker-compose network
[chains.cosmos.layer-localnode]
chain_id = "layer-local"
bech32_prefix = "layer"
rpc_endpoint = "http://layer:26657"
grpc_endpoint = "http://layer:9090"
gas_price = 0.025
gas_denom = "ulayer"
faucet_endpoint = "http://faucet:8000"

# hacknet is our public facing pseudo-testnet for hackathons
[chains.cosmos.layer-hacknet]
chain_id = "layer-hack-1"
bech32_prefix = "layer"
rpc_endpoint = "https://rpc.hack.layer.xyz:443"
grpc_endpoint = "https://grpc.hack.layer.xyz:443"
gas_price = 0.025
gas_denom = "ulayer"
faucet_endpoint = "https://rabbit.hack.layer.xyz"

[chains.cosmos.neutron]
chain_id = "pion-1"
bech32_prefix = "neutron"
rpc_endpoint = "https://rpc-falcron.pion-1.ntrn.tech"
grpc_endpoint = "http://grpc-falcron.pion-1.ntrn.tech:80"
gas_price = 0.0053
gas_denom = "untrn"

[chains.eth.local]
chain_id = "31337"
ws_endpoint = "ws://localhost:8545"
http_endpoint = "http://localhost:8545"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.local2]
chain_id = "31338"
ws_endpoint = "ws://localhost:8645"
http_endpoint = "http://localhost:8645"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.sepolia]
chain_id = "11155111"
ws_endpoint = "wss://ethereum-sepolia-rpc.publicnode.com"
http_endpoint = "https://ethereum-sepolia-rpc.publicnode.com"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.holesky]
chain_id = "17000"
ws_endpoint = "wss://ethereum-holesky-rpc.publicnode.com"
http_endpoint = "https://ethereum-holesky-rpc.publicnode.com"
aggregator_endpoint = "http://localhost:8001"
````

## File: docker-compose.yml
````yaml
###################################
#
# make start-all
#
# docker exec -it wavs bash
#
###################################

services:
  # anvil:
  #   image: "ghcr.io/foundry-rs/foundry:stable"
  #   platform: linux/amd64
  #   container_name: "anvil"
  #   network_mode: "host"
  #   ports:
  #     - "8545:8545"
  #   environment:
  #     ANVIL_IP_ADDR: 0.0.0.0
  #   command: ["anvil", "--no-cors"]

  # The main instance all WAVS interaction will happen from
  wavs:
    image: "ghcr.io/lay3rlabs/wavs:0.3.0"
    container_name: "wavs"
    stop_signal: SIGKILL
    # depends_on: ["anvil"]
    network_mode: "host"
    env_file: "./.env"
    ports:
      - "8000:8000"
    environment:
      WAVS_HOME: "/wavs/packages/wavs"
      WAVS_CLI_HOME: "/wavs/packages/cli"
      WAVS_AGGREGATOR_HOME: "/wavs/packages/aggregator"
    command: ["wavs"]
    volumes:
      - "./:/wavs"
      - "./.docker:/root/wavs/cli/"

  aggregator:
    image: "ghcr.io/lay3rlabs/wavs:0.3.0"
    container_name: "wavs-aggregator"
    stop_signal: SIGKILL
    depends_on: ["wavs"]
    env_file: "./.env"
    ports:
      - "8001:8001"
    command: ["wavs-aggregator"]
    volumes:
      - "./:/wavs"
    network_mode: "host"

  deploy-eigenlayer:
    image: "ghcr.io/lay3rlabs/wavs:0.3.0"
    container_name: "wavs-deploy-eigenlayer"
    depends_on: ["wavs", "aggregator"] # "anvil",
    restart: "no"
    env_file: "./.env"
    command: ["wavs-cli", "deploy-eigen-core"]
    volumes:
      - "./:/wavs"
      - "./.docker:/root/wavs/cli/"
    network_mode: "host"

  deploy-eigenlayer-service-manager:
    image: "ghcr.io/lay3rlabs/wavs:0.3.0"
    container_name: "wavs-deploy-service-manager"
    depends_on:
      deploy-eigenlayer:
        condition: service_completed_successfully
    restart: "no"
    env_file: "./.env"
    command: ["wavs-cli", "deploy-eigen-service-manager"]
    volumes:
      - "./:/wavs"
      - "./.docker:/root/wavs/cli/"
    network_mode: "host"
````

## File: foundry.toml
````toml
[profile.default]
src = 'src'
out = 'out'
libs = ['lib']
solidity_version = '0.8.22'
evm_version = 'shanghai'
# via_ir = true
fs_permissions = [{ access = "read-write", path = "./" },]

# See more config options https://github.com/foundry-rs/foundry/tree/master/config
````

## File: LICENSE
````
Copyright 2025 Layer Labs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

## File: Makefile
````
#!/usr/bin/make -f

# Check if user is in docker group to determine if sudo is needed
SUDO := $(shell if groups | grep -q docker; then echo ''; else echo 'sudo'; fi)

# Default target is build
default: build

# Customize these variables
COMPONENT_FILENAME ?= eth_price_oracle.wasm
TRIGGER_EVENT ?= NewTrigger(bytes)
SERVICE_CONFIG ?= '{"fuel_limit":100000000,"max_gas":5000000,"host_envs":[],"kv":[],"workflow_id":"default","component_id":"default"}'

# Define common variables
CARGO?=cargo
WAVS_CMD ?= $(SUDO) docker run --rm --network host $$(test -f .env && echo "--env-file ./.env") -v $$(pwd):/data ghcr.io/lay3rlabs/wavs:0.3.0 wavs-cli
ANVIL_PRIVATE_KEY?=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL?=http://localhost:8545
SERVICE_MANAGER_ADDR?=`jq -r '.eigen_service_managers.local | .[-1]' .docker/deployments.json`
SERVICE_TRIGGER_ADDR?=`jq -r '.trigger' "./.docker/script_deploy.json"`
SERVICE_SUBMISSION_ADDR?=`jq -r '.service_handler' "./.docker/script_deploy.json"`
COIN_MARKET_CAP_ID?=1

## check-requirements: verify system requirements are installed
check-requirements: check-node check-jq check-cargo

## build: building the project
build: _build_forge wasi-build

## wasi-build: building the WAVS wasi component(s)
wasi-build:
	@for component in $(shell ls ./components); do \
		echo "Building component: $$component"; \
		(cd components/$$component; cargo component build --release; cargo fmt); \
	done
	@mkdir -p ./compiled
	@cp ./target/wasm32-wasip1/release/*.wasm ./compiled/

## wasi-exec: executing the WAVS wasi component(s) | COMPONENT_FILENAME, COIN_MARKET_CAP_ID
wasi-exec:
	@$(WAVS_CMD) exec --log-level=info --data /data/.docker --home /data \
	--component "/data/compiled/${COMPONENT_FILENAME}" \
	--service-config $(SERVICE_CONFIG) \
	--input `cast format-bytes32-string $(COIN_MARKET_CAP_ID)`

## update-submodules: update the git submodules
update-submodules:
	@git submodule update --init --recursive

## clean: cleaning the project files
clean: clean-docker
	@forge clean
	@$(CARGO) clean
	@rm -rf cache
	@rm -rf out
	@rm -rf broadcast

## clean-docker: remove unused docker containers
clean-docker:
	@$(SUDO) docker rm -v $(shell $(SUDO) docker ps --filter status=exited -q) || true

## fmt: formatting solidity and rust code
fmt:
	@forge fmt --check
	@$(CARGO) fmt

## test: running tests
test:
	@forge test

## setup: install initial dependencies
setup: check-requirements
	@forge install
	@npm install

## start-all: starting anvil and WAVS with docker compose
# running anvil out of compose is a temp work around for MacOS
start-all: clean-docker setup-env
	@rm --interactive=never .docker/*.json || true
	@bash -ec 'anvil & anvil_pid=$$!; trap "kill -9 $$anvil_pid 2>/dev/null" EXIT; $(SUDO) docker compose up; wait'

## get-service-handler: getting the service handler address from the script deploy
get-service-handler-from-deploy:
	@jq -r '.service_handler' "./.docker/script_deploy.json"

get-eigen-service-manager-from-deploy:
	@jq -r '.eigen_service_managers.local | .[-1]' .docker/deployments.json

## get-trigger: getting the trigger address from the script deploy
get-trigger-from-deploy:
	@jq -r '.trigger' "./.docker/script_deploy.json"

## wavs-cli: running wavs-cli in docker
wavs-cli:
	@$(WAVS_CMD) $(filter-out $@,$(MAKECMDGOALS))

## deploy-service: deploying the WAVS component service | COMPONENT_FILENAME, TRIGGER_EVENT, SERVICE_TRIGGER_ADDR, SERVICE_SUBMISSION_ADDR, SERVICE_CONFIG
deploy-service:
	@$(WAVS_CMD) deploy-service --log-level=info --data /data/.docker --home /data \
	--component "/data/compiled/${COMPONENT_FILENAME}" \
	--trigger-event-name "${TRIGGER_EVENT}" \
	--trigger-address "${SERVICE_TRIGGER_ADDR}" \
	--submit-address "${SERVICE_SUBMISSION_ADDR}" \
	--service-config ${SERVICE_CONFIG}

## show-result: showing the result | SERVICE_TRIGGER_ADDR, SERVICE_SUBMISSION_ADDR, RPC_URL
show-result:
	@forge script ./script/ShowResult.s.sol ${SERVICE_TRIGGER_ADDR} ${SERVICE_SUBMISSION_ADDR} --sig "run(string,string)" --rpc-url $(RPC_URL) --broadcast -v 4

_build_forge:
	@forge build

# Declare phony targets
.PHONY: build clean fmt bindings test

.PHONY: help
help: Makefile
	@echo
	@echo " Choose a command run"
	@echo
	@sed -n 's/^##//p' $< | column -t -s ':' |  sed -e 's/^/ /'
	@echo

# helpers

.PHONY: setup-env
setup-env:
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			echo "Creating .env file from .env.example..."; \
			cp .env.example .env; \
			echo ".env file created successfully!"; \
		fi; \
	fi

# check versions

check-command:
	@command -v $(1) > /dev/null 2>&1 || (echo "Command $(1) not found. Please install $(1), reference the System Requirements section"; exit 1)

.PHONY: check-node
check-node:
	@$(call check-command,node)
	@NODE_VERSION=$$(node --version); \
	MAJOR_VERSION=$$(echo $$NODE_VERSION | sed 's/^v\([0-9]*\)\..*/\1/'); \
	if [ $$MAJOR_VERSION -lt 21 ]; then \
		echo "Error: Node.js version $$NODE_VERSION is less than the required v21."; \
		echo "Please upgrade Node.js to v21 or higher."; \
		exit 1; \
	fi

.PHONY: check-jq
check-jq:
	@$(call check-command,jq)

.PHONY: check-cargo
check-cargo:
	@$(call check-command,cargo)
````

## File: natspec-smells.config.js
````javascript
/**
 * List of supported options: https://github.com/defi-wonderland/natspec-smells?tab=readme-ov-file#options
 */

/** @type {import('@defi-wonderland/natspec-smells').Config} */
module.exports = {
  include: 'src/**/*.sol',
  exclude: '(test|scripts)/**/*.sol',
};
````

## File: package.json
````json
{
  "name": "wavs-foundry-template",
  "version": "1.0.0",
  "license": "MIT",
  "scripts": {
    "build": "forge build",
    "coverage": "forge coverage --report summary --report lcov --match-path 'test/unit/*'",
    "deploy:local": "forge script Deploy ${SERVICE_MANAGER} --sig 'run(string)' --rpc-url http://localhost:8545 --broadcast -vvvvv",
    "lint:check": "yarn lint:sol && forge fmt --check",
    "lint:fix": "sort-package-json && forge fmt && yarn lint:sol --fix",
    "lint:natspec": "npx @defi-wonderland/natspec-smells --config natspec-smells.config.js",
    "lint:sol": "solhint 'src/**/*.sol' 'script/**/*.sol' 'test/**/*.sol'",
    "test": "forge test -vvv",
    "test:integration": "forge test --match-contract Integration -vvv",
    "test:unit": "forge test --match-contract Unit -vvv"
  },
  "lint-staged": {
    "*.{js,css,md,ts,sol}": "forge fmt",
    "(src|test|script)/**/*.sol": "yarn lint:sol",
    "package.json": "sort-package-json"
  },
  "dependencies": {
    "@commitlint/cli": "19.3.0",
    "@commitlint/config-conventional": "19.2.2",
    "@defi-wonderland/natspec-smells": "1.1.6",
    "@openzeppelin/contracts": "^5.2.0",
    "@wavs/solidity": "^0.3.0",
    "forge-std": "github:foundry-rs/forge-std#v1.9.6",
    "lint-staged": ">=10",
    "solhint-community": "4.0.0",
    "sort-package-json": "2.10.0"
  }
}
````

## File: README.md
````markdown
# [WAVS](https://docs.wavs.xyz) Monorepo Template

**Template for getting started with developing WAVS applications**

A template for developing WebAssembly AVS applications using Rust and Solidity, configured for Windows *WSL*, Linux, and MacOS. The sample oracle service fetches the current price of a cryptocurrency from [CoinMarketCap](https://coinmarketcap.com) and saves it on chain.

## System Requirements

<details>
<summary>Core (Docker, Compose, Make, JQ, Node v21+)</summary>

### Docker
- **MacOS**: `brew install --cask docker`
- **Linux**: `sudo apt -y install docker.io`
- **Windows WSL**: [docker desktop wsl](https://docs.docker.com/desktop/wsl/#turn-on-docker-desktop-wsl-2) & `sudo chmod 666 /var/run/docker.sock`
- [Docker Documentation](https://docs.docker.com/get-started/get-docker/)

### Docker Compose
- **MacOS**: Already installed with Docker installer
- **Linux + Windows WSL**: `sudo apt-get install docker-compose-v2`
- [Compose Documentation](https://docs.docker.com/compose/)

### Make
- **MacOS**: `brew install make`
- **Linux + Windows WSL**: `sudo apt -y install make`
- [Make Documentation](https://www.gnu.org/software/make/manual/make.html)

### JQ
- **MacOS**: `brew install jq`
- **Linux + Windows WSL**: `sudo apt -y install jq`
- [JQ Documentation](https://jqlang.org/download/)

### Node.js
- **Required Version**: v21+
- [Installation via NVM](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
</details>

<details>

<summary>Rust v1.84+</summary>

### Rust Installation

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

rustup toolchain install stable
rustup target add wasm32-wasip2
```

### Upgrade Rust

```bash
# Remove old targets if present
rustup target remove wasm32-wasi || true
rustup target remove wasm32-wasip1 || true

# Update and add required target
rustup update stable
rustup target add wasm32-wasip2
```

</details>

<details>
<summary>Cargo Components</summary>

### Install Cargo Components

```bash
# Install required cargo components
# https://github.com/bytecodealliance/cargo-component#installation
cargo install cargo-binstall
cargo binstall cargo-component warg-cli wkg --locked --no-confirm --force

# Configure default registry
wkg config --default-registry wa.dev
```

</details>

## Create Project

```bash
# If you don't have foundry: `curl -L https://foundry.paradigm.xyz | bash && $HOME/.foundry/bin/foundryup`
forge init --template Lay3rLabs/wavs-foundry-template my-wavs --branch 0.3
```

> [!TIP]
> Run `make help` to see all available commands and environment variable overrides.

### Solidity

Install the required packages to build the Solidity contracts. This project supports both [submodules](./.gitmodules) and [npm packages](./package.json).

```bash
# Install packages (npm & submodules)
make setup

# Build the contracts
forge build

# Run the solidity tests
forge test
```

### Build WASI components

Now build the WASI rust components into the `compiled` output directory.

> [!WARNING]
> If you get: `error: no registry configured for namespace "wavs"`
>
> run, `wkg config --default-registry wa.dev`

> [!WARNING]
> If you get: `failed to find the 'wasm32-wasip1' target and 'rustup' is not available`
>
> `brew uninstall rust` & install it from <https://rustup.rs>

```bash
make wasi-build # or `make build` to include solidity compilation.
```

### Execute WASI component directly

Test run the component locally to validate the business logic works. An ID of 1 is Bitcoin. Nothing will be saved on-chain, just the output of the component is shown. This input is formatted using `cast format-bytes32-string` in the makefile command.

```bash
COIN_MARKET_CAP_ID=1 make wasi-exec
```

## WAVS

> [!NOTE]
> If you are running on a Mac with an ARM chip, you will need to do the following:
> - Set up Rosetta: `softwareupdate --install-rosetta`
> - Enable Rosetta (Docker Desktop: Settings -> General -> enable "Use Rosetta for x86_64/amd64 emulation on Apple Silicon")
>
> Configure one of the following networking:
> - Docker Desktop: Settings -> Resources -> Network -> 'Enable Host Networking'
> - `brew install chipmk/tap/docker-mac-net-connect && sudo brew services start chipmk/tap/docker-mac-net-connect`

### Start Environment

Start an Ethereum node (anvil), the WAVS service, and deploy [eigenlayer](https://www.eigenlayer.xyz/) contracts to the local network.

```bash
cp .env.example .env

# Start the backend
#
# This must remain running in your terminal. Use another terminal to run other commands.
# You can stop the services with `ctrl+c`. Some MacOS terminals require pressing it twice.
make start-all
```

### Deploy Contract

Upload your service's trigger and submission contracts. The trigger contract is where WAVS will watch for events, and the submission contract is where the AVS service operator will submit the result on chain.

```bash
export SERVICE_MANAGER_ADDR=`make get-eigen-service-manager-from-deploy`
forge script ./script/Deploy.s.sol ${SERVICE_MANAGER_ADDR} --sig "run(string)" --rpc-url http://localhost:8545 --broadcast
```

> [!TIP]
> You can see the deployed trigger address with `make get-trigger-from-deploy`
> and the deployed submission address with `make get-service-handler-from-deploy`

## Deploy Service

Deploy the compiled component with the contracts from the previous steps. Review the [makefile](./Makefile) for more details and configuration options.`TRIGGER_EVENT` is the event that the trigger contract emits and WAVS watches for. By altering `SERVICE_TRIGGER_ADDR` you can watch events for contracts others have deployed.

```bash
TRIGGER_EVENT="NewTrigger(bytes)" make deploy-service
```

## Trigger the Service

Anyone can now call the [trigger contract](./src/contracts/WavsTrigger.sol) which emits the trigger event WAVS is watching for from the previous step. WAVS then calls the service and saves the result on-chain.

```bash
export COIN_MARKET_CAP_ID=1
export SERVICE_TRIGGER_ADDR=`make get-trigger-from-deploy`
forge script ./script/Trigger.s.sol ${SERVICE_TRIGGER_ADDR} ${COIN_MARKET_CAP_ID} --sig "run(string,string)" --rpc-url http://localhost:8545 --broadcast -v 4
```

## Show the result

Query the latest submission contract id from the previous request made.

```bash
# Get the latest TriggerId and show the result via `script/ShowResult.s.sol`
make show-result
```
````

## File: remappings.txt
````
@openzeppelin-contracts=node_modules/@openzeppelin/contracts/
@wavs/=node_modules/@wavs/solidity
forge-std=node_modules/forge-std/src

contracts/=src/contracts
interfaces/=src/interfaces
````

## File: rustfmt.toml
````toml
use_small_heuristics = "Max"
use_field_init_shorthand = true

# See more keys and their definitions at https://rust-lang.github.io/rustfmt

# # unstable - require nightly rustfmt
# imports_granularity = "Crate"
# wrap_comments = true
# comment_width = 100
# # ignore automatically generated bindings
# ignore = ["crates/bindings/"]
````

## File: wavs.toml
````toml
# these values can be overriden by environment variables
# by following the pattern WAVS_<UPPERCASE_KEY>
# so for example, the key `port` can be overriden by setting the environment variable `WAVS_PORT`
# for arrays use a comma-separated list in a single string
# e.g. WAVS_LOG_LEVEL="info, wavs=debug" or WAVS_CORS_ALLOWED_ORIGINS="https://example.com, https://example2.com"

# the port on which the server will listen. Default is 8000
# port = 9000

# The log level, in the format of tracing directives. Default is ["info"]
# See https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html#directives for more information
# e.g. WAVS_LOG_LEVEL="info, wavs=debug"
log_level = ["info", "wavs=debug"]

# the allowed cors origins. Default is empty list.
cors_allowed_origins = [
  "https://lay3rlabs.github.io/*",
  "http://localhost:*",
  "http://127.0.0.1:*",
]

# the host to serve on. Default is localhost
# host = "localhost"

# the directory to store the data. Default is "/var/wavs"
# data = "~/wavs/data"

# active chain names to watch for triggers
active_trigger_chains = ["local"]

max_wasm_fuel = 1_000_000

[chains.cosmos.layer-local]
chain_id = "slay3r-local"
bech32_prefix = "layer"
rpc_endpoint = "http://localhost:26657"
grpc_endpoint = "http://localhost:9090"
gas_price = 0.025
gas_denom = "uslay"
faucet_endpoint = "http://localhost:8000"

# localnode is local testing inside localnode docker-compose network
[chains.cosmos.layer-localnode]
chain_id = "layer-local"
bech32_prefix = "layer"
rpc_endpoint = "http://layer:26657"
grpc_endpoint = "http://layer:9090"
gas_price = 0.025
gas_denom = "ulayer"
faucet_endpoint = "http://faucet:8000"

# hacknet is our public facing pseudo-testnet for hackathons
[chains.cosmos.layer-hacknet]
chain_id = "layer-hack-1"
bech32_prefix = "layer"
rpc_endpoint = "https://rpc.hack.layer.xyz:443"
grpc_endpoint = "https://grpc.hack.layer.xyz:443"
gas_price = 0.025
gas_denom = "ulayer"
faucet_endpoint = "https://rabbit.hack.layer.xyz"

[chains.cosmos.neutron]
chain_id = "pion-1"
bech32_prefix = "neutron"
rpc_endpoint = "https://rpc-falcron.pion-1.ntrn.tech"
grpc_endpoint = "http://grpc-falcron.pion-1.ntrn.tech:80"
gas_price = 0.0053
gas_denom = "untrn"

[chains.eth.local]
chain_id = "31337"
ws_endpoint = "ws://localhost:8545"
http_endpoint = "http://localhost:8545"

[chains.eth.local-aggregator]
chain_id = "31337"
ws_endpoint = "ws://localhost:8545"
http_endpoint = "http://localhost:8545"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.local2]
chain_id = "31338"
ws_endpoint = "ws://localhost:8645"
http_endpoint = "http://localhost:8645"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.sepolia]
chain_id = "11155111"
ws_endpoint = "wss://ethereum-sepolia-rpc.publicnode.com"
http_endpoint = "https://ethereum-sepolia-rpc.publicnode.com"
aggregator_endpoint = "http://localhost:8001"

[chains.eth.holesky]
chain_id = "17000"
ws_endpoint = "wss://ethereum-holesky-rpc.publicnode.com"
http_endpoint = "https://ethereum-holesky-rpc.publicnode.com"
aggregator_endpoint = "http://localhost:8001"
````
