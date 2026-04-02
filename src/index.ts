import { HyperDash } from "./hyperdash";
import { loadUI } from "./ui/index";
const WALLET="0x8434b7844fd17fad52f0aceae50a834cd4896577";
const hd = new HyperDash("0x007d76eec0ba411ce873a8819df50dd443d967a0");

hd.listenUpdates()

loadUI();