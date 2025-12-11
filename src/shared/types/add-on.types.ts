import { EBankStatementDuration, EOnboardingAddonType } from '../constants';
type AddOnMetadataType = {
  duration: EBankStatementDuration;
};

export interface AddOnsType {
  addonType: EOnboardingAddonType;
  metadata?: AddOnMetadataType;
}
