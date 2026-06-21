import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type VRAvatarVariant = 'male' | 'female' | 'party-male';

interface UseVRAvatarProfileResult {
  avatarVariant: VRAvatarVariant;
  isLoading: boolean;
}

const FEMALE_HINTS = ['female', 'woman', 'girl', 'zoe', 'helena', 'she', 'her'];
const MALE_HINTS = ['male', 'man', 'boy', 'leon', 'he', 'him'];
const PARTY_MALE_HINTS = ['party-male', 'party male', 'party_male', 'party-m', 'party m'];
const VR_AVATAR_SELECTION_KEY = 'zoe_vr_avatar_variant_v1';

const normalize = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const inferVariantFromMetadata = (avatarData: unknown): VRAvatarVariant | null => {
  if (!avatarData || typeof avatarData !== 'object') return null;

  const data = avatarData as Record<string, unknown>;
  const metadataText = [
    data.gender,
    data.sex,
    data.body_type,
    data.bodyType,
    data.variant,
    data.avatar_variant,
    data.avatarType,
    data.model,
    data.model_name,
    data.character,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(' ');

  if (!metadataText) return null;
  if (PARTY_MALE_HINTS.some((hint) => metadataText.includes(hint))) return 'party-male';
  if (FEMALE_HINTS.some((hint) => metadataText.includes(hint))) return 'female';
  if (MALE_HINTS.some((hint) => metadataText.includes(hint))) return 'male';

  return null;
};

const inferVariant = ({
  gender,
  avatarType,
  displayName,
  username,
  avatarName,
  avatarData,
}: {
  gender?: unknown;
  avatarType?: unknown;
  displayName?: unknown;
  username?: unknown;
  avatarName?: unknown;
  avatarData?: unknown;
}): VRAvatarVariant => {
  const normalizedGender = normalize(gender);
  const normalizedAvatarType = normalize(avatarType);

  if (normalizedGender.includes('female')) return 'female';
  if (normalizedGender.includes('male')) return 'male';

  if (normalizedAvatarType.includes('female')) return 'female';
  if (normalizedAvatarType.includes('male')) return 'male';

  const metadataVariant = inferVariantFromMetadata(avatarData);
  if (metadataVariant) return metadataVariant;

  const identityText = [displayName, username, avatarName]
    .map(normalize)
    .filter(Boolean)
    .join(' ');

  if (FEMALE_HINTS.some((hint) => identityText.includes(hint))) return 'female';
  if (MALE_HINTS.some((hint) => identityText.includes(hint))) return 'male';

  return 'male';
};

export const useVRAvatarProfile = (): UseVRAvatarProfileResult => {
  const { user } = useAuth();
  const [avatarVariant, setAvatarVariant] = useState<VRAvatarVariant>(() => {
    const stored = localStorage.getItem(VR_AVATAR_SELECTION_KEY) as VRAvatarVariant | null;
    return stored === 'female' || stored === 'party-male' || stored === 'male' ? stored : 'male';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      if (!user?.id) {
        if (!isCancelled) {
          setAvatarVariant('male');
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const stored = localStorage.getItem(VR_AVATAR_SELECTION_KEY) as VRAvatarVariant | null;
        if (stored === 'female' || stored === 'party-male' || stored === 'male') {
          if (!isCancelled) setAvatarVariant(stored);
          return;
        }

        const [profileRes, avatarRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('gender, display_name, username')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('zoe_avatar_profiles')
            .select('avatar_type, avatar_name, avatar_data')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const inferred = inferVariant({
          gender: profileRes.data?.gender,
          avatarType: avatarRes.data?.avatar_type,
          displayName: profileRes.data?.display_name,
          username: profileRes.data?.username,
          avatarName: avatarRes.data?.avatar_name,
          avatarData: avatarRes.data?.avatar_data,
        });

        if (!isCancelled) {
          setAvatarVariant(inferred);
        }
      } catch (error) {
        if (!isCancelled) {
          setAvatarVariant('male');
        }
        console.warn('[useVRAvatarProfile] Falling back to male avatar variant.', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const onAvatarSwitch = (event: Event) => {
      const next = (event as CustomEvent<{ variant?: VRAvatarVariant }>).detail?.variant;
      if (next !== 'male' && next !== 'female' && next !== 'party-male') return;
      localStorage.setItem(VR_AVATAR_SELECTION_KEY, next);
      setAvatarVariant(next);
    };
    window.addEventListener('zoe-vr-avatar-variant-changed', onAvatarSwitch);
    return () => window.removeEventListener('zoe-vr-avatar-variant-changed', onAvatarSwitch);
  }, []);

  return { avatarVariant, isLoading };
};

export default useVRAvatarProfile;