export class Vector2{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    /** Returns the length of the vector */
    get length(){
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    /** Returns the squared length of the vector */
    get length2(){
        return this.x * this.x + this.y * this.y;
    }
    /** The angle of this vector makes from the horizontal */
    get angle(){
        return Math.atan2(this.y, this.x);
    }
    /** Returns a new normalised vector, or a zero-vector if its magnitude is 0. */
    normalise(){
        let length = this.length;
        if (length === 0){
            return new Vector2(0, 0);
        }
        return new Vector2(this.x / length, this.y / length);
    }
    /** Adds two vectors and returns a new vector */
    add(v){
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    /** Subtracts two vectors and returns a new vector */
    sub(v){
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    /** Multiplies a vector by a scalar and returns a new vector */
    mul(s){
        return new Vector2(this.x * s, this.y * s);
    }
    /** Divides a vector by a scalar and returns a new vector */
    div(s){
        return new Vector2(this.x / s, this.y / s);
    }
    /** Returns the dot product of two vectors */
    dot(v){
        return this.x * v.x + this.y * v.y;
    }
    /** Returns a new vector with the same coordinates as this object */
    copy(){
        return new Vector2(this.x, this.y);
    }
    /** Returns a vector with coordinates rotated by the input angle */
    rotate(angle){
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }
    /** Adds this object's coordinates to the input vector */
    addSelf(v){
        this.x += v.x;
        this.y += v.y;
    }
    /** Subtracts the input vector's coordinates from this object's coordinates */
    subSelf(v){
        this.x -= v.x;
        this.y -= v.y;
    }
    /** Multiplies this object's coordinates by the input scalar */
    mulSelf(s){
        this.x *= s;
        this.y *= s;
    }
    /** Divides this object's coordinates by the input scalar */
    divSelf(s){
        this.x /= s;
        this.y /= s;
    }
    /** Returns the origin vector (0,0) */
    static origin(){
        return new Vector2(0, 0);
    }
    /** Returns a vector pointing up (0,1) */
    static up(){
        return new Vector2(0, 1);
    }
    /** Returns a vector pointing down (0,-1) */
    static down(){
        return new Vector2(0, -1);
    }
    /** Returns a vector pointing left (-1,0) */
    static left(){
        return new Vector2(-1, 0);
    }
    /** Returns a vector pointing right (1,0) */
    static right(){
        return new Vector2(1, 0);
    }
    /** Reflects a vector around a normal */
    static reflect(v, normal){
        let n = normal.normalise();
        return v.sub(n.mul(2 * v.dot(n)));
    }
    /** Returns a vector with box-random coordinates */
    static random(x, y){
        return new Vector2(Math.random()*(x || 1), Math.random()*(y || 1));
    }
    /** Returns a unit vector with random direction */
    static unitRandom(){
        let angle = Math.random() * Math.PI * 2;
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }
}