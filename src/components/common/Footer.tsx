'use server'

export async function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="px-4 py-2 bg-muted">
            <div className="container min-w-full flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-primary">g3nACM</h2>
                    <h3 className="text-xs text-muted-foreground">&copy; {currentYear} All rights reserved.</h3>
                </div>
                <div>
                    <h3 className="text-sm">Contact Us</h3>
                    <p className="text-xs text-muted-foreground">Email: contact@g3nacm.com</p>
                    <p className="text-xs text-muted-foreground">Phone: +1 (123) 456-7890</p>
                </div>
            </div>
        </footer>
    )
}