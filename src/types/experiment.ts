import { JumperWire, PlacedIC, PlacedLED, PlacedResistor, PlacedSegmentDisplay, PlacedSwitch } from './circuit';

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
  wiresToAdd?: JumperWire[];
  icToAdd?: PlacedIC;
  icsToAdd?: PlacedIC[];
  resistorToAdd?: PlacedResistor;
  resistorsToAdd?: PlacedResistor[];
  ledToAdd?: PlacedLED;
  ledsToAdd?: PlacedLED[];
  switchToAdd?: PlacedSwitch;
  switchesToAdd?: PlacedSwitch[];
  segmentDisplayToAdd?: PlacedSegmentDisplay;
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
