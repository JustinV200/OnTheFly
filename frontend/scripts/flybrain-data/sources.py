"""Downloads the three public files the brain data is built from into a local cache directory.
It only fetches and caches; nothing here parses or transforms the data.
"""

from dataclasses import dataclass
from pathlib import Path
import urllib.request


@dataclass(frozen=True, slots=True)
class SourceFile:
    """One upstream file, where it comes from, and the name it is cached under."""

    cache_name: str
    url: str
    description: str


# The connectivity and neuron list are the exact files Shiu et al.'s model loads for FlyWire release 783, so the
# browser simulation runs on the same network as the published model. The annotations supply positions and classes.
CONNECTIVITY = SourceFile(
    cache_name="Connectivity_783.parquet",
    url="https://github.com/philshiu/Drosophila_brain_model/raw/main/Connectivity_783.parquet",
    description="Neuron-to-neuron synapse counts and signs (Shiu et al. model input, FlyWire release 783)",
)
COMPLETENESS = SourceFile(
    cache_name="Completeness_783.csv",
    url="https://raw.githubusercontent.com/philshiu/Drosophila_brain_model/main/Completeness_783.csv",
    description="The model's neuron list; row order defines the connectivity file's neuron indices",
)
ANNOTATIONS = SourceFile(
    cache_name="Supplemental_file1_neuron_annotations.tsv",
    url=(
        "https://raw.githubusercontent.com/flyconnectome/flywire_annotations/main/"
        "supplemental_files/Supplemental_file1_neuron_annotations.tsv"
    ),
    description="Per-neuron positions and cell classes (Schlegel et al. 2024)",
)

ALL_SOURCES = (CONNECTIVITY, COMPLETENESS, ANNOTATIONS)


def fetch_sources(cache_dir: Path) -> dict[str, Path]:
    """Download any source missing from cache_dir and return each source's local path by cache name.

    An existing cached file is trusted as-is, so delete it to force a fresh download.
    """

    cache_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    for source in ALL_SOURCES:
        path = cache_dir / source.cache_name
        if not path.exists():
            print(f"Downloading {source.description}\n  {source.url}")
            # Write to a temporary name first so an interrupted download never looks like a cached file.
            partial = path.with_suffix(path.suffix + ".partial")
            urllib.request.urlretrieve(source.url, partial)
            partial.rename(path)
        paths[source.cache_name] = path
    return paths
