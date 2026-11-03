import { JumperWire, PlacedIC, PlacedLED, PlacedResistor, PlacedSwitch } from './circuit';

export interface ApparatusItem {
  id: string;
  name: string;
  count: number;
  description: string;
  colorCode?: string;
}

export interface NavigationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  subText: string;
  commonPitfall?: string;
  highlightHoles: string[];
  wireToAdd?: JumperWire;
  icToAdd?: PlacedIC;
  resistorToAdd?: PlacedResistor;
  ledToAdd?: PlacedLED;
  switchToAdd?: PlacedSwitch;
}

export interface Experiment {
  id: string;
  title: string;
  category: string;
  aim: string;
  apparatus: ApparatusItem[];
  theory: string;
  truthTable: {
    headers: string[];
    rows: (string | number)[][];
  };
  steps: NavigationStep[];
}
