"""Render six portraits from the shipped GLB in a separate Blender scene."""
import bpy, os
from pathlib import Path
from mathutils import Vector
root=Path(os.environ.get("CONVERSEBETTER_ROOT",os.getcwd()))
original=bpy.context.window.scene
stage=bpy.data.scenes.new("Export inspection")
bpy.context.window.scene=stage
bpy.ops.import_scene.gltf(filepath=str(root/"public/visit/margaret.glb"),import_scene_as_collection=True)
for obj in list(stage.objects):
    if obj.name.startswith("Cube"): obj.hide_render=True
camera=bpy.data.cameras.new("Portrait lens")
cam=bpy.data.objects.new("Portrait camera",camera)
stage.collection.objects.link(cam)
cam.location=(.15,-3.5,1.05)
cam.rotation_euler=(Vector((0,0,.66))-cam.location).to_track_quat("-Z","Y").to_euler()
camera.type='ORTHO'
camera.ortho_scale=1.65
stage.camera=cam
stage.render.engine="BLENDER_WORKBENCH"
for obj in stage.objects:
    if obj.type=="MESH":
        for mat in obj.data.materials:
            if mat and mat.node_tree:
                shader=next((node for node in mat.node_tree.nodes if node.type=="BSDF_PRINCIPLED"),None)
                if shader: mat.diffuse_color=shader.inputs["Base Color"].default_value
stage.display.shading.color_type="MATERIAL"
stage.display.shading.light="STUDIO"
stage.render.film_transparent=True
stage.render.resolution_x=stage.render.resolution_y=384
stage.render.resolution_percentage=100
for name in ["neutral","happy","worried","confused","scared","angry"]:
    for obj in stage.objects:
        keys=getattr(obj.data,"shape_keys",None)
        if keys:
            for key in list(keys.key_blocks)[1:]: key.value=float(key.name==name)
    stage.render.filepath=str(root/("public/visit/"+name+".png"))
    bpy.ops.render.render(write_still=True,scene=stage.name)
bpy.context.window.scene=original
