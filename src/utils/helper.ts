export function isEmail(email: string): boolean {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}

export function parseLinearName(input: string): string {
    if (isEmail(input)) {
        const [unformattedName] = input.split('@');
        return unformattedName.split('.').map(part =>
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join('_');
    } else {
        return input;
    }
}