package com.aitherwarth.capes.mixin;

import net.minecraft.client.network.AbstractClientPlayerEntity;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import com.aitherwarth.capes.CapeManager;

@Mixin(AbstractClientPlayerEntity.class)
public class AbstractClientPlayerEntityMixin {

    @Inject(method = "getSkinTextures", at = @At("RETURN"), cancellable = true)
    private void injectCustomTextures(CallbackInfoReturnable<SkinTextures> cir) {
        SkinTextures original = cir.getReturnValue();
        if (original == null) return;

        AbstractClientPlayerEntity player = (AbstractClientPlayerEntity) (Object) this;
        String username = player.getGameProfile().getName();

        // Query the CapeManager for our website custom assets
        Identifier customCape = CapeManager.getOrCreateCape(username);
        Identifier customSkin = CapeManager.getOrCreateSkin(username);

        if (customCape != null || customSkin != null) {
            // Re-construct the SkinTextures record with our custom cape and skin overrides
            SkinTextures modifiedTextures = new SkinTextures(
                customSkin != null ? customSkin : original.texture(),
                original.textureUrl(),
                customCape != null ? customCape : original.capeTexture(),
                original.elytraTexture(),
                original.model(),
                original.secure()
            );
            cir.setReturnValue(modifiedTextures);
        }
    }
}
