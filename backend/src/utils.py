# src/utils.py
import yaml

def load_config(path="config.yaml"):
    """
    Load YAML configuration file.
    """
    with open(path, "r") as f:
        return yaml.safe_load(f)
