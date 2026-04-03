import { HyperDash } from "./hyperdash";
import { loadUI } from "./ui/index";
const WALLET="0x8434b7844fd17fad52f0aceae50a834cd4896577";
const hd = new HyperDash("0x3ff54fd26855db3758d0b5ae7aed47440c47f705");

hd.listenUpdates()

loadUI();