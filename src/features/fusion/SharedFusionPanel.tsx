import { PetFusionPanel } from '../pet/PetFusionPanel';

/**
 * Backwards-compatible shared fusion entrypoint.
 *
 * Some older routes/imports still point at `features/fusion/SharedFusionPanel`.
 * The pet fusion UI now lives in `features/pet/PetFusionPanel`.
 */
export const SharedFusionPanel = () => {
    return <PetFusionPanel />;
};

export default SharedFusionPanel;
