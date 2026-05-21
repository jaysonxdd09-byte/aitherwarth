package com.aitherwarth.capes;

import net.fabricmc.api.ClientModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AitherWarthCapes implements ClientModInitializer {
    public static final String MOD_ID = "aitherwarth-capes";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitializeClient() {
        LOGGER.info("AitherWarth Capes & Skins Mod initialized successfully!");
    }
}
