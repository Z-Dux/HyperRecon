import { HyperDash } from "./hyperdash";
import { loadUI } from "./ui/index";

const hd = new HyperDash("0x8434b7844fd17fad52f0aceae50a834cd4896577");

hd.listenUpdates()

loadUI();