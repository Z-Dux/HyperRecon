import { HyperDash } from "./hyperdash";
import { loadUI } from "./ui/index";
const WALLET="0x8434b7844fd17fad52f0aceae50a834cd4896577";
const hd = new HyperDash("0x7c976f00e84db0b44f945fc6d7fad34b43150a1a");

hd.listenUpdates()

loadUI();